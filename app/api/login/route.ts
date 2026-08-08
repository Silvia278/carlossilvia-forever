import { createToken, json, options } from "../../../lib/auth";
import { env } from "cloudflare:workers";

export async function OPTIONS(request: Request) { return options(request); }
export async function POST(request: Request) {
  const { username, password } = await request.json() as { username?: string; password?: string };
  if (!username || !["Carlos", "Silvia"].includes(username) || password !== env.COUPLE_PASSWORD) {
    return json(request, { error: "用户名或密码不正确" }, 401);
  }
  return json(request, { token: await createToken(username), username });
}
