CREATE TABLE `standup_reactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`response_user_name` text NOT NULL,
	`reacting_user_name` text NOT NULL,
	`emoji` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `standup_meta` ADD `presentation_theme` text DEFAULT 'default';--> statement-breakpoint
ALTER TABLE `standup_responses` ADD `kudos` text;--> statement-breakpoint
ALTER TABLE `standup_responses` ADD `icebreaker_answer` text;