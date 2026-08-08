CREATE TABLE `shared_auth_challenges` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`kind` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `shared_auth_challenges_expires_idx` ON `shared_auth_challenges` (`expires_at`);
--> statement-breakpoint
DELETE FROM `mfa_recovery_codes`;
--> statement-breakpoint
DELETE FROM `mfa_credentials`;
