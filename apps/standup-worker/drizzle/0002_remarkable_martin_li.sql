PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_standup_responses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_name` text NOT NULL,
	`is_in_person` integer DEFAULT 0 NOT NULL,
	`yesterday` text DEFAULT '' NOT NULL,
	`today` text DEFAULT '' NOT NULL,
	`has_blocker` integer DEFAULT 0 NOT NULL,
	`blocker_description` text,
	`health_check` integer DEFAULT 3 NOT NULL,
	`linked_tickets` text,
	`kudos` text,
	`icebreaker_answer` text,
	`submitted_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_standup_responses`("id", "user_name", "is_in_person", "yesterday", "today", "has_blocker", "blocker_description", "health_check", "linked_tickets", "kudos", "icebreaker_answer", "submitted_at", "updated_at") SELECT "id", "user_name", "is_in_person", "yesterday", "today", "has_blocker", "blocker_description", "health_check", "linked_tickets", "kudos", "icebreaker_answer", "submitted_at", "updated_at" FROM `standup_responses`;--> statement-breakpoint
DROP TABLE `standup_responses`;--> statement-breakpoint
ALTER TABLE `__new_standup_responses` RENAME TO `standup_responses`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `standup_responses_user_name_unique` ON `standup_responses` (`user_name`);