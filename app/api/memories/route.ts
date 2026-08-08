import { env } from "cloudflare:workers";
import { desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { memories } from "../../../db/schema";

export async function GET() {
  try {
    return Response.json({ memories: await getDb().select().from(memories).orderBy(desc(memories.memoryDate)) });
  } catch { return Response.json({ memories: [] }); }
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("photo");
  const title = String(form.get("title") ?? "").trim();
  if (!(file instanceof File) || !title) return Response.json({ error: "请选择照片并写下标题" }, { status: 400 });
  if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) return Response.json({ error: "请上传 10MB 以内的图片" }, { status: 400 });
  const objectKey = `${Date.now()}-${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "") || "memory.jpg"}`;
  await env.MEMORIES.put(objectKey, file.stream(), { httpMetadata: { contentType: file.type } });
  const [memory] = await getDb().insert(memories).values({
    author: form.get("author") === "Carlos" ? "Carlos" : "Silvia", title,
    note: String(form.get("note") ?? "").trim(), memoryDate: String(form.get("memoryDate") ?? ""),
    objectKey, contentType: file.type, createdAt: new Date().toISOString(),
  }).returning();
  return Response.json({ memory }, { status: 201 });
}
