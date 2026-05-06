CREATE TABLE `wheel_session_stats` (
	`room_key` text PRIMARY KEY NOT NULL,
	`mode` text NOT NULL,
	`total_participants` integer NOT NULL,
	`entry_count` integer NOT NULL,
	`enabled_entry_count` integer NOT NULL,
	`spin_count` integer NOT NULL,
	`unique_winner_count` integer NOT NULL,
	`removed_after_count` integer NOT NULL,
	`repeat_winner_count` integer NOT NULL,
	`last_updated_at` integer NOT NULL
);
