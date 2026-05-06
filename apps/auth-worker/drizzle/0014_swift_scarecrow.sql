CREATE TABLE `workspace_process_loops` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`goal` text,
	`status` text DEFAULT 'active' NOT NULL,
	`starts_at` integer,
	`ends_at` integer,
	`created_by_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`completed_at` integer,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `workspace_process_loops_team_status_idx` ON `workspace_process_loops` (`team_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_process_loops_team_key_unique` ON `workspace_process_loops` (`team_id`,`key`);--> statement-breakpoint
CREATE TABLE `workspace_session_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`process_loop_id` integer NOT NULL,
	`session_id` integer NOT NULL,
	`linked_by_id` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`process_loop_id`) REFERENCES `workspace_process_loops`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `team_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`linked_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `workspace_session_links_team_loop_idx` ON `workspace_session_links` (`team_id`,`process_loop_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_session_links_session_unique` ON `workspace_session_links` (`session_id`);--> statement-breakpoint
CREATE TABLE `workspace_action_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`process_loop_id` integer,
	`source` text NOT NULL,
	`source_session_id` integer,
	`source_ref` text NOT NULL,
	`title` text NOT NULL,
	`detail` text,
	`status` text DEFAULT 'open' NOT NULL,
	`priority` text DEFAULT 'normal' NOT NULL,
	`owner_user_id` integer,
	`owner_name` text,
	`due_at` integer,
	`external_provider` text,
	`external_ticket_key` text,
	`external_ticket_url` text,
	`created_by_id` integer NOT NULL,
	`resolved_by_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`resolved_at` integer,
	`metadata` text,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`process_loop_id`) REFERENCES `workspace_process_loops`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`source_session_id`) REFERENCES `team_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`resolved_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `workspace_action_items_team_status_idx` ON `workspace_action_items` (`team_id`,`status`);--> statement-breakpoint
CREATE INDEX `workspace_action_items_team_loop_idx` ON `workspace_action_items` (`team_id`,`process_loop_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_action_items_source_unique` ON `workspace_action_items` (`team_id`,`source`,`source_session_id`,`source_ref`);--> statement-breakpoint
CREATE TABLE `workspace_action_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`action_id` integer NOT NULL,
	`actor_user_id` integer,
	`event_type` text NOT NULL,
	`from_status` text,
	`to_status` text,
	`note` text,
	`metadata` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`action_id`) REFERENCES `workspace_action_items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `workspace_action_events_action_idx` ON `workspace_action_events` (`action_id`);--> statement-breakpoint
CREATE INDEX `workspace_action_events_team_idx` ON `workspace_action_events` (`team_id`);