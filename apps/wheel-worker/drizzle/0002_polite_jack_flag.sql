ALTER TABLE `wheel_users` ADD `workspace_user_id` integer;--> statement-breakpoint
CREATE INDEX `idx_wheel_users_workspace_user_id` ON `wheel_users` (`workspace_user_id`);