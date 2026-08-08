import { env } from "cloudflare:workers";

const allowedOrigin = "https://silvia278.github.io";

export function corsHeaders(request: Request) {
  const origin = request.headers.get("origin");
  const headers = new Headers({ "vary": "Origin" });
  if (origin === allowedOrigin || origin?.startsWith("http://localhost:")) {
    headers.set("access-control-allow-origin", origin);
    headers.set("access-control-allow-headers", "authorization, content-type");
    headers.set("access-control-allow-methods", "GET, POST, DELETE, OPTIONS");
  }
  return headers;
}

async function signature(username: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.AUTH_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const bytes = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${username}:${env.COUPLE_PASSWORD}`));
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export async function createToken(username: string) {
  return `${username}.${await signature(username)}`;
}

export async function authorize(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const [username, supplied] = token.split(".");
  if (!(["Carlos", "Silvia"].includes(username)) || !supplied) return null;
  const expected = await signature(username);
  if (supplied.length !== expected.length) return null;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) mismatch |= supplied.charCodeAt(i) ^ expected.charCodeAt(i);
  return mismatch === 0 ? username : null;
}

export function json(request: Request, data: unknown, status = 200) {
  const headers = corsHeaders(request); headers.set("content-type", "application/json");
  return new Response(JSON.stringify(data), { status, headers });
}

export function options(request: Request) { return new Response(null, { status: 204, headers: corsHeaders(request) }); }
