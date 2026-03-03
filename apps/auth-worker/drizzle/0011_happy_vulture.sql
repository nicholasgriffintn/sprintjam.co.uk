CREATE TABLE `workspace_memberships` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`organisation_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`role` text NOT NULL,
	`status` text NOT NULL,
	`approved_by_id` integer,
	`approved_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`organisation_id`) REFERENCES `organisations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`approved_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspace_memberships_org_user_unique` ON `workspace_memberships` (`organisation_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `workspace_memberships_org_status_idx` ON `workspace_memberships` (`organisation_id`,`status`);--> statement-breakpoint
CREATE INDEX `workspace_memberships_user_status_idx` ON `workspace_memberships` (`user_id`,`status`);--> statement-breakpoint
CREATE TABLE `team_memberships` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`team_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`role` text NOT NULL,
	`status` text NOT NULL,
	`approved_by_id` integer,
	`approved_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`approved_by_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_memberships_team_user_unique` ON `team_memberships` (`team_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `team_memberships_team_status_idx` ON `team_memberships` (`team_id`,`status`);--> statement-breakpoint
CREATE INDEX `team_memberships_user_status_idx` ON `team_memberships` (`user_id`,`status`);--> statement-breakpoint
ALTER TABLE `organisations` ADD `require_member_approval` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `teams` ADD `access_policy` text DEFAULT 'open' NOT NULL;
--> statement-breakpoint
INSERT OR IGNORE INTO `workspace_memberships` (
	`organisation_id`,
	`user_id`,
	`role`,
	`status`,
	`approved_by_id`,
	`approved_at`,
	`created_at`,
	`updated_at`
)
SELECT
	`organisations`.`id`,
	`organisations`.`owner_id`,
	'admin',
	'active',
	`organisations`.`owner_id`,
	COALESCE(`organisations`.`updated_at`, CAST(strftime('%s','now') AS integer) * 1000),
	COALESCE(`organisations`.`created_at`, CAST(strftime('%s','now') AS integer) * 1000),
	COALESCE(`organisations`.`updated_at`, CAST(strftime('%s','now') AS integer) * 1000)
FROM `organisations`
WHERE `organisations`.`owner_id` IS NOT NULL;
--> statement-breakpoint
INSERT OR IGNORE INTO `workspace_memberships` (
	`organisation_id`,
	`user_id`,
	`role`,
	`status`,
	`approved_by_id`,
	`approved_at`,
	`created_at`,
	`updated_at`
)
SELECT
	`users`.`organisation_id`,
	`users`.`id`,
	'member',
	'active',
	CASE
		WHEN `organisations`.`owner_id` IS NOT NULL THEN `organisations`.`owner_id`
		ELSE `users`.`id`
	END,
	COALESCE(`users`.`created_at`, CAST(strftime('%s','now') AS integer) * 1000),
	COALESCE(`users`.`created_at`, CAST(strftime('%s','now') AS integer) * 1000),
	COALESCE(`users`.`updated_at`, CAST(strftime('%s','now') AS integer) * 1000)
FROM `users`
LEFT JOIN `organisations` ON `organisations`.`id` = `users`.`organisation_id`;
--> statement-breakpoint
INSERT OR IGNORE INTO `team_memberships` (
	`team_id`,
	`user_id`,
	`role`,
	`status`,
	`approved_by_id`,
	`approved_at`,
	`created_at`,
	`updated_at`
)
SELECT
	`teams`.`id`,
	`teams`.`owner_id`,
	'admin',
	'active',
	`teams`.`owner_id`,
	COALESCE(`teams`.`created_at`, CAST(strftime('%s','now') AS integer) * 1000),
	COALESCE(`teams`.`created_at`, CAST(strftime('%s','now') AS integer) * 1000),
	COALESCE(`teams`.`updated_at`, CAST(strftime('%s','now') AS integer) * 1000)
FROM `teams`;
