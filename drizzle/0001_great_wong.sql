CREATE TABLE `workshop_progress` (
	`user_id` text PRIMARY KEY NOT NULL,
	`completed_at` integer NOT NULL,
	`graph_json` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL
);
