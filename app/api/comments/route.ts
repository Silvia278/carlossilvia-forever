import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { comments } from "../../../db/schema";
import { authorize, json, options } from "../../../lib/auth";

export async function OPTIONS(request: Request) { return options(request); }

export async function POST(request: Request) {
  const signedInAs = await authorize(request);
  if (!signedInAs) return json(request, { error: "请先登录" }, 401);
  const payload = (await request.json()) as Record<string, unknown>;
  const content = String(payload.content ?? "").trim();
  const entryId = Number(payload.entryId);
  if (!content || !entryId) return json(request, { error: "留言不能为空" }, 400);
  const db = getDb();
  const [comment] = await db.insert(comments).values({
    entryId, content, author: signedInAs,
    createdAt: new Date().toISOString(),
  }).returning();
  return json(request, { comment }, 201);
}

export async function DELETE(request: Request) {
  const signedInAs = await authorize(request);
  if (!signedInAs) return json(request, { error: "请先登录" }, 401);
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return json(request, { error: "无效留言" }, 400);
  const db = getDb();
  const [comment] = await db.select().from(comments).where(eq(comments.id, id)).limit(1);
  if (!comment) return json(request, { error: "这条留言已经不存在了" }, 404);
  if (comment.author !== signedInAs) return json(request, { error: "只能删除自己的留言" }, 403);
  await db.delete(comments).where(and(eq(comments.id, id), eq(comments.author, signedInAs)));
  return json(request, { ok: true });
}
