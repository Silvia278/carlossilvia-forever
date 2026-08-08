import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const entries = sqliteTable("entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  kind: text("kind").notNull().default("diary"),
  author: text("author").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  mood: text("mood").notNull().default("平静"),
  category: text("category").notNull().default("Love"),
  eventDate: text("event_date").notNull(),
  eventTime: text("event_time").notNull(),
  together: integer("together", { mode: "boolean" }).notNull().default(false),
  photoKey: text("photo_key"),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_entries_event_date_time").on(table.eventDate, table.eventTime), index("idx_entries_kind").on(table.kind)]);

export const comments = sqliteTable("comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  entryId: integer("entry_id").notNull(),
  author: text("author").notNull(),
  content: text("content").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_comments_entry_id").on(table.entryId)]);

export const memories = sqliteTable("memories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  author: text("author").notNull(),
  title: text("title").notNull(),
  note: text("note").notNull().default(""),
  memoryDate: text("memory_date").notNull(),
  objectKey: text("object_key").notNull(),
  contentType: text("content_type").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_memories_memory_date").on(table.memoryDate)]);
