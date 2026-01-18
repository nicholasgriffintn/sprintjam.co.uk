CREATE TABLE `auth_challenges` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`token_hash` text NOT NULL,
	`type` text NOT NULL,
	`method` text,
	`metadata` text,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`used_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_challenges_token_hash_unique` ON `auth_challenges` (`token_hash`);--> statement-breakpoint
CREATE INDEX `auth_challenges_user_expires_idx` ON `auth_challenges` (`user_id`,`expires_at`);--> statement-breakpoint
CREATE TABLE `mfa_credentials` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`type` text NOT NULL,
	`secret_encrypted` text,
	`credential_id` text,
	`public_key` text,
	`counter` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `mfa_credentials_user_type_idx` ON `mfa_credentials` (`user_id`,`type`);--> statement-breakpoint
CREATE INDEX `mfa_credentials_credential_id_idx` ON `mfa_credentials` (`credential_id`);--> statement-breakpoint
CREATE TABLE `mfa_recovery_codes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`code_hash` text NOT NULL,
	`used_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mfa_recovery_codes_code_hash_unique` ON `mfa_recovery_codes` (`code_hash`);--> statement-breakpoint
CREATE INDEX `mfa_recovery_codes_user_idx` ON `mfa_recovery_codes` (`user_id`);--> statement-breakpoint
CREATE TABLE `login_audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer,
	`email` text,
	`event` text NOT NULL,
	`status` text NOT NULL,
	`reason` text,
	`ip` text,
	`user_agent` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `login_audit_logs_user_idx` ON `login_audit_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `login_audit_logs_email_idx` ON `login_audit_logs` (`email`);--> statement-breakpoint
CREATE INDEX `login_audit_logs_created_idx` ON `login_audit_logs` (`created_at`);