CREATE TABLE `oauth_credentials` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`room_key` text NOT NULL,
	`provider` text NOT NULL,
	`access_token` text NOT NULL,
	`refresh_token` text,
	`token_type` text NOT NULL,
	`expires_at` integer NOT NULL,
	`scope` text,
	`authorized_by` text NOT NULL,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_oauth_room_provider` ON `oauth_credentials` (`room_key`,`provider`);--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_credentials_room_key_provider_unique` ON `oauth_credentials` (`room_key`,`provider`);--> statement-breakpoint
CREATE TABLE `room_meta` (
	`id` integer PRIMARY KEY NOT NULL,
	`room_key` text NOT NULL,
	`moderator` text NOT NULL,
	`show_votes` integer DEFAULT 0 NOT NULL,
	`passcode` text,
	`judge_score` text,
	`judge_metadata` text,
	`settings` text NOT NULL,
	`current_strudel_code` text,
	`current_strudel_generation_id` text,
	`strudel_phase` text,
	`strudel_is_playing` integer DEFAULT 0 NOT NULL,
	`current_ticket_id` integer,
	`timer_seconds` integer DEFAULT 0,
	`timer_last_updated` integer DEFAULT 0,
	`timer_is_paused` integer DEFAULT 0,
	`timer_target_duration` integer DEFAULT 600,
	`timer_round_anchor` integer DEFAULT 0,
	`timer_auto_reset` integer DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE `room_users` (
	`user_name` text PRIMARY KEY NOT NULL,
	`avatar` text,
	`is_connected` integer DEFAULT 0 NOT NULL,
	`is_spectator` integer DEFAULT 0 NOT NULL,
	`ordinal` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_users_connected` ON `room_users` (`is_connected`);--> statement-breakpoint
CREATE TABLE `room_votes` (
	`user_name` text PRIMARY KEY NOT NULL,
	`vote` text NOT NULL,
	`structured_vote_payload` text
);
--> statement-breakpoint
CREATE TABLE `session_tokens` (
	`user_name` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ticket_queue` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticket_id` text NOT NULL,
	`title` text,
	`description` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`outcome` text,
	`created_at` integer NOT NULL,
	`completed_at` integer,
	`ordinal` integer NOT NULL,
	`external_service` text DEFAULT 'none',
	`external_service_id` text,
	`external_service_metadata` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ticket_queue_ticket_id_unique` ON `ticket_queue` (`ticket_id`);--> statement-breakpoint
CREATE INDEX `idx_tickets_status_ordinal` ON `ticket_queue` (`status`,`ordinal`);--> statement-breakpoint
CREATE INDEX `idx_tickets_external` ON `ticket_queue` (`external_service`,`external_service_id`);--> statement-breakpoint
CREATE TABLE `ticket_votes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ticket_queue_id` integer NOT NULL,
	`user_name` text NOT NULL,
	`vote` text NOT NULL,
	`structured_vote_payload` text,
	`voted_at` integer NOT NULL,
	FOREIGN KEY (`ticket_queue_id`) REFERENCES `ticket_queue`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_ticket_votes_ticket` ON `ticket_votes` (`ticket_queue_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ticket_votes_ticket_queue_id_user_name_unique` ON `ticket_votes` (`ticket_queue_id`,`user_name`);