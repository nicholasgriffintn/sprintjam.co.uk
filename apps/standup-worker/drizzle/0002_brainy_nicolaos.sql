ALTER TABLE `standup_users` ADD `workspace_user_id` integer;--> statement-breakpoint
CREATE INDEX `idx_standup_users_workspace_user_id` ON `standup_users` (`workspace_user_id`);