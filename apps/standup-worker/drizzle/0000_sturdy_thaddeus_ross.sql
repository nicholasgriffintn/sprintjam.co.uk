CREATE TABLE `standup_meta` (
	`id` integer PRIMARY KEY NOT NULL,
	`standup_key` text NOT NULL,
	`moderator` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`passcode` text,
	`team_id` integer,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `standup_responses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_name` text NOT NULL,
	`yesterday` text NOT NULL,
	`today` text NOT NULL,
	`has_blocker` integer DEFAULT 0 NOT NULL,
	`blocker_description` text,
	`health_check` integer DEFAULT 3 NOT NULL,
	`linked_tickets` text,
	`submitted_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `standup_responses_user_name_unique` ON `standup_responses` (`user_name`);--> statement-breakpoint
CREATE TABLE `standup_session_tokens` (
	`user_name` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `standup_users` (
	`user_name` text PRIMARY KEY NOT NULL,
	`avatar` text,
	`is_connected` integer DEFAULT 0 NOT NULL,
	`ordinal` integer DEFAULT 0 NOT NULL
);
