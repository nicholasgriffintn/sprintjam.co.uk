CREATE TABLE `team_collaboration_installations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`platform` text NOT NULL,
	`context_key` text NOT NULL,
	`tenant_id` text NOT NULL,
	`external_team_id` text,
	`external_channel_id` text,
	`external_chat_id` text,
	`external_user_id` text,
	`display_name` text,
	`installed_by_id` integer NOT NULL,
	`metadata` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`installed_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_collaboration_installations_platform_context_key_unique` ON `team_collaboration_installations` (`platform`,`context_key`);