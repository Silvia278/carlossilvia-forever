import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { comments, entries } from "../../../db/schema";
import { authorize, json, options } from "../../../lib/auth";

export async function OPTIONS(request: Request) { return options(request); }
export async function GET(request: Request) {
  if (!await authorize(request)) return json(request, { error: "请先登录" }, 401);
  try {
    const db = getDb();
    const [entryRows, commentRows] = await Promise.all([
      db.select().from(entries).orderBy(asc(entries.eventDate), asc(entries.eventTime)),
      db.select().from(comments).orderBy(asc(comments.id)),
    ]);
    return json(request, { entries: entryRows, comments: commentRows });
  } catch {
    return json(request, { entries: [], comments: [] });
  }
}

export async function POST(request: Request) {
  const signedInAs = await authorize(request);
  if (!signedInAs) return json(request, { error: "请先登录" }, 401);
  const payload = (await request.json()) as Record<string, unknown>;
  const author = signedInAs;
  const title = String(payload.title ?? "").trim();
  if (!title) return json(request, { error: "请写下今天发生的事" }, 400);
  const db = getDb();
  const [entry] = await db.insert(entries).values({
    kind: String(payload.kind ?? "diary"), author, title,
    content: String(payload.content ?? "").trim(), mood: String(payload.mood ?? "平静"),
    category: String(payload.category ?? "Love"), eventDate: String(payload.eventDate),
    eventTime: String(payload.eventTime), together: Boolean(payload.together),
    createdAt: new Date().toISOString(),
  }).returning();
  return json(request, { entry }, 201);
}

export async function DELETE(request: Request) {
  const signedInAs = await authorize(request);
  if (!signedInAs) return json(request, { error: "请先登录" }, 401);
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!id) return json(request, { error: "无效记录" }, 400);
  const db = getDb();
  const [entry] = await db.select().from(entries).where(eq(entries.id, id)).limit(1);
  if (!entry) return json(request, { error: "这条内容已经不存在了" }, 404);
  if (entry.author !== signedInAs) return json(request, { error: "只能删除自己发布的内容" }, 403);
  await db.delete(comments).where(eq(comments.entryId, id));
  await db.delete(entries).where(and(eq(entries.id, id), eq(entries.author, signedInAs)));
  return json(request, { ok: true });
}
