CREATE TABLE `mfa_reset_requests` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`organisation_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`requested_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`resolved_at` integer,
	`resolved_by_id` integer,
	FOREIGN KEY (`organisation_id`) REFERENCES `organisations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`resolved_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `mfa_reset_requests_org_status_expires_idx` ON `mfa_reset_requests` (`organisation_id`,`status`,`expires_at`);
--> statement-breakpoint
CREATE INDEX `mfa_reset_requests_user_status_idx` ON `mfa_reset_requests` (`user_id`,`status`);
--> statement-breakpoint
DELETE FROM `shared_auth_challenges`;
--> statement-breakpoint
ALTER TABLE `shared_auth_challenges` ADD `user_id` integer REFERENCES users(id) ON DELETE cascade;
--> statement-breakpoint
CREATE INDEX `shared_auth_challenges_user_idx` ON `shared_auth_challenges` (`user_id`);
