CREATE TABLE `standup_session_stats` (
	`room_key` text PRIMARY KEY NOT NULL,
	`total_participants` integer NOT NULL,
	`responses_submitted` integer NOT NULL,
	`health_score_total` integer NOT NULL,
	`health_response_count` integer NOT NULL,
	`blocker_count` integer NOT NULL,
	`unresolved_blocker_count` integer NOT NULL,
	`linked_ticket_count` integer NOT NULL,
	`kudos_count` integer NOT NULL,
	`last_updated_at` integer NOT NULL
);
