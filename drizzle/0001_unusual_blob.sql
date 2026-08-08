CREATE INDEX `idx_comments_entry_id` ON `comments` (`entry_id`);--> statement-breakpoint
CREATE INDEX `idx_entries_event_date_time` ON `entries` (`event_date`,`event_time`);--> statement-breakpoint
CREATE INDEX `idx_entries_kind` ON `entries` (`kind`);--> statement-breakpoint
CREATE INDEX `idx_memories_memory_date` ON `memories` (`memory_date`);