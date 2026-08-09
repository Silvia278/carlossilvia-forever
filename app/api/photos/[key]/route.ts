import { env } from "cloudflare:workers";
import { authorize, corsHeaders, json, options } from "../../../../lib/auth";

export async function OPTIONS(request: Request) { return options(request); }

export async function GET(request: Request, { params }: { params: Promise<{ key: string }> }) {
  if (!await authorize(request)) return json(request, { error: "请先登录后查看照片" }, 401);
  const { key } = await params;
  const object = await env.MEMORIES.get(key);
  if (!object) return json(request, { error: "照片不存在" }, 404);
  const headers = corsHeaders(request);
  object.writeHttpMetadata(headers);
  headers.set("cache-control", "private, no-store");
  return new Response(object.body, { headers });
}
