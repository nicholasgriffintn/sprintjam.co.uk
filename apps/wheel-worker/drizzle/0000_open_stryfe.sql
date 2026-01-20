CREATE TABLE `wheel_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry_id` text NOT NULL,
	`name` text NOT NULL,
	`enabled` integer DEFAULT 1 NOT NULL,
	`ordinal` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wheel_entries_entry_id_unique` ON `wheel_entries` (`entry_id`);--> statement-breakpoint
CREATE TABLE `wheel_meta` (
	`id` integer PRIMARY KEY NOT NULL,
	`wheel_key` text NOT NULL,
	`moderator` text NOT NULL,
	`wheel_status` text DEFAULT 'active' NOT NULL,
	`passcode` text,
	`settings` text NOT NULL,
	`spin_state` text
);
--> statement-breakpoint
CREATE TABLE `wheel_results` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`result_id` text NOT NULL,
	`winner` text NOT NULL,
	`timestamp` integer NOT NULL,
	`removed_after` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `wheel_results_result_id_unique` ON `wheel_results` (`result_id`);--> statement-breakpoint
CREATE TABLE `wheel_session_tokens` (
	`user_name` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `wheel_users` (
	`user_name` text PRIMARY KEY NOT NULL,
	`avatar` text,
	`is_connected` integer DEFAULT 0 NOT NULL,
	`ordinal` integer DEFAULT 0 NOT NULL
);
