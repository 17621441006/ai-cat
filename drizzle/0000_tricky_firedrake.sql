CREATE TABLE `discussions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`author` text NOT NULL,
	`parent_id` text,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`category` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_discussions_parent_created` ON `discussions` (`parent_id`,`created_at`);