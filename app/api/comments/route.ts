import { getDb } from "../../../db";
import { comments } from "../../../db/schema";

export async function POST(request: Request) {
  const payload = (await request.json()) as Record<string, unknown>;
  const content = String(payload.content ?? "").trim();
  const entryId = Number(payload.entryId);
  if (!content || !entryId) return Response.json({ error: "留言不能为空" }, { status: 400 });
  const db = getDb();
  const [comment] = await db.insert(comments).values({
    entryId, content, author: payload.author === "Carlos" ? "Carlos" : "Silvia",
    createdAt: new Date().toISOString(),
  }).returning();
  return Response.json({ comment }, { status: 201 });
}
