import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { comments, entries } from "../../../db/schema";

export async function GET() {
  try {
    const db = getDb();
    const [entryRows, commentRows] = await Promise.all([
      db.select().from(entries).orderBy(asc(entries.eventDate), asc(entries.eventTime)),
      db.select().from(comments).orderBy(asc(comments.id)),
    ]);
    return Response.json({ entries: entryRows, comments: commentRows });
  } catch {
    return Response.json({ entries: [], comments: [] });
  }
}

export async function POST(request: Request) {
  const payload = (await request.json()) as Record<string, unknown>;
  const author = payload.author === "Carlos" ? "Carlos" : "Silvia";
  const title = String(payload.title ?? "").trim();
  if (!title) return Response.json({ error: "请写下今天发生的事" }, { status: 400 });
  const db = getDb();
  const [entry] = await db.insert(entries).values({
    kind: String(payload.kind ?? "diary"), author, title,
    content: String(payload.content ?? "").trim(), mood: String(payload.mood ?? "平静"),
    category: String(payload.category ?? "Love"), eventDate: String(payload.eventDate),
    eventTime: String(payload.eventTime), together: Boolean(payload.together),
    createdAt: new Date().toISOString(),
  }).returning();
  return Response.json({ entry }, { status: 201 });
}

export async function DELETE(request: Request) {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return Response.json({ error: "无效记录" }, { status: 400 });
  const db = getDb();
  await db.delete(comments).where(eq(comments.entryId, id));
  await db.delete(entries).where(eq(entries.id, id));
  return Response.json({ ok: true });
}
