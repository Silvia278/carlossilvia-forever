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
    const form = await request.formData();
    const file = form.get("photo");
    const title = String(form.get("title") ?? "").trim();
    const memoryDate = String(form.get("memoryDate") ?? "");
    if (!(file instanceof File) || !title || !memoryDate) return json(request, { error: "请选择照片，并填写标题和日期" }, 400);
    if ((!file.type.startsWith("image/") && !/\.(heic|heif)$/i.test(file.name)) || file.size > 25 * 1024 * 1024) return json(request, { error: "请选择 25MB 以内的照片" }, 400);
    const objectKey = `${Date.now()}-${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "") || "memory.jpg"}`;
    await env.MEMORIES.put(objectKey, await file.arrayBuffer(), { httpMetadata: { contentType: file.type || "application/octet-stream" } });
    const [memory] = await getDb().insert(memories).values({
      author: signedInAs, title, note: String(form.get("note") ?? "").trim(), memoryDate,
      objectKey, contentType: file.type || "application/octet-stream", createdAt: new Date().toISOString(),
    }).returning();
    return json(request, { memory }, 201);
  } catch (error) {
    console.error("Memory upload failed", error);
    return json(request, { error: "照片上传没有完成，请稍后重试" }, 500);
  }
}
