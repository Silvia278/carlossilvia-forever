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
  const signedInAs = await authorize(request);
  if (!signedInAs) return json(request, { error: "请先登录" }, 401);
  const form = await request.formData();
  const file = form.get("photo");
  const title = String(form.get("title") ?? "").trim();
  if (!(file instanceof File) || !title) return json(request, { error: "请选择照片并写下标题" }, 400);
  if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) return json(request, { error: "请上传 10MB 以内的图片" }, 400);
  const objectKey = `${Date.now()}-${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "") || "memory.jpg"}`;
  await env.MEMORIES.put(objectKey, file.stream(), { httpMetadata: { contentType: file.type } });
  const [memory] = await getDb().insert(memories).values({
    author: signedInAs, title,
    note: String(form.get("note") ?? "").trim(), memoryDate: String(form.get("memoryDate") ?? ""),
    objectKey, contentType: file.type, createdAt: new Date().toISOString(),
  }).returning();
  return json(request, { memory }, 201);
}
