CREATE TABLE `retro_session_stats` (
	`room_key` text PRIMARY KEY NOT NULL,
	`template_id` text NOT NULL,
	`template_name` text NOT NULL,
	`total_participants` integer NOT NULL,
	`card_count` integer NOT NULL,
	`vote_count` integer NOT NULL,
	`action_count` integer NOT NULL,
	`completed_action_count` integer NOT NULL,
	`duration_ms` integer,
	`last_updated_at` integer NOT NULL
);
