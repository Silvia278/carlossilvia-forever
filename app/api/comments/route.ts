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
