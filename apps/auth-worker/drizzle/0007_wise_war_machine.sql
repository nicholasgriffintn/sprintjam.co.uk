CREATE TABLE `workspace_invites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`organisation_id` integer NOT NULL,
	`email` text NOT NULL,
	`invited_by_id` integer NOT NULL,
	`accepted_by_id` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`accepted_at` integer,
	`revoked_at` integer,
	FOREIGN KEY (`organisation_id`) REFERENCES `organisations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`invited_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`accepted_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_invites_org_email_unique` ON `workspace_invites` (`organisation_id`,`email`);--> statement-breakpoint
CREATE INDEX `workspace_invites_email_pending_idx` ON `workspace_invites` (`email`,`accepted_at`,`revoked_at`);--> statement-breakpoint
CREATE INDEX `workspace_invites_org_idx` ON `workspace_invites` (`organisation_id`);--> statement-breakpoint
ALTER TABLE `organisations` ADD `logo_url` text;