import { env } from "cloudflare:workers";
import { desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { memories } from "../../../db/schema";
import { authorize, json, options } from "../../../lib/auth";

export async function OPTIONS(request: Request) { return options(request); }
export async function GET(request: Request) {
  if (!await authorize(request)) return json(request, { error: "请先登录" }, 401);
  try {
    return json(request, { memories: await getDb().select().from(memories).orderBy(desc(memories.memoryDate)) });
  } catch { return json(request, { memories: [] }); }
}

export async function POST(request: Request) {
  try {
    const signedInAs = await authorize(request);
    if (!signedInAs) return json(request, { error: "登录已过期，请重新登录" }, 401);
    const decode = (name: string) => { try { return decodeURIComponent(request.headers.get(name) ?? ""); } catch { return ""; } };
    const fileName = decode("x-file-name");
    const title = decode("x-memory-title").trim();
    const memoryDate = request.headers.get("x-memory-date") ?? "";
    const note = decode("x-memory-note").trim();
    const contentType = request.headers.get("content-type") ?? "application/octet-stream";
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (!request.body || !fileName || !title || !memoryDate) return json(request, { error: "请选择照片，并填写标题和日期" }, 400);
    if ((!contentType.startsWith("image/") && !/\.(heic|heif)$/i.test(fileName)) || contentLength > 25 * 1024 * 1024) return json(request, { error: "请选择 25MB 以内的照片" }, 400);
    const bytes = await request.arrayBuffer();
    if (!bytes.byteLength || bytes.byteLength > 25 * 1024 * 1024) return json(request, { error: "请选择 25MB 以内的照片" }, 400);
    const objectKey = `${Date.now()}-${crypto.randomUUID()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "") || "memory.jpg"}`;
    await env.MEMORIES.put(objectKey, bytes, { httpMetadata: { contentType } });
    const [memory] = await getDb().insert(memories).values({
      author: signedInAs, title, note, memoryDate,
      objectKey, contentType, createdAt: new Date().toISOString(),
    }).returning();
    return json(request, { memory }, 201);
  } catch (error) {
    console.error("Memory upload failed", error);
    return json(request, { error: "照片上传没有完成，请稍后重试" }, 500);
  }
}
