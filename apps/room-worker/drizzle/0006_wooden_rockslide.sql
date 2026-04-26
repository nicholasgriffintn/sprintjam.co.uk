ALTER TABLE `room_users` ADD `workspace_user_id` integer;--> statement-breakpoint
CREATE INDEX `idx_users_workspace_user_id` ON `room_users` (`workspace_user_id`);