CREATE TABLE `round_votes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`room_key` text NOT NULL,
	`round_id` text NOT NULL,
	`ticket_id` text,
	`judge_score` text,
	`judge_metadata` text,
	`round_ended_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `round_votes_round_id_unique` ON `round_votes` (`round_id`);--> statement-breakpoint
CREATE INDEX `idx_round_votes_room` ON `round_votes` (`room_key`);--> statement-breakpoint
CREATE INDEX `idx_round_votes_ended` ON `round_votes` (`round_ended_at`);--> statement-breakpoint
CREATE TABLE `vote_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`round_id` text NOT NULL,
	`user_name` text NOT NULL,
	`vote` text NOT NULL,
	`structured_vote_payload` text,
	`voted_at` integer NOT NULL,
	FOREIGN KEY (`round_id`) REFERENCES `round_votes`(`round_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_vote_records_round` ON `vote_records` (`round_id`);--> statement-breakpoint
CREATE INDEX `idx_vote_records_user` ON `vote_records` (`user_name`);--> statement-breakpoint
CREATE UNIQUE INDEX `vote_records_round_user` ON `vote_records` (`round_id`,`user_name`);--> statement-breakpoint
CREATE TABLE `room_stats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`room_key` text NOT NULL,
	`total_rounds` integer DEFAULT 0 NOT NULL,
	`total_votes` integer DEFAULT 0 NOT NULL,
	`last_updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `room_stats_room_key_unique` ON `room_stats` (`room_key`);--> statement-breakpoint
CREATE INDEX `idx_room_stats_key` ON `room_stats` (`room_key`);