CREATE TABLE `claims` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`applicant_id` text NOT NULL,
	`evidence` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`review_note` text DEFAULT '' NOT NULL,
	`owner_confirmed` integer DEFAULT 0 NOT NULL,
	`applicant_confirmed` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`applicant_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `claims_item` ON `claims` (`item_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `active_applicant` ON `claims` (`item_id`,`applicant_id`) WHERE "claims"."status" IN ('pending','approved');--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`item_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`note` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`category` text NOT NULL,
	`place` text NOT NULL,
	`happened_on` text NOT NULL,
	`description` text NOT NULL,
	`question` text DEFAULT '' NOT NULL,
	`private_note` text DEFAULT '' NOT NULL,
	`image` text DEFAULT '' NOT NULL,
	`visual` text DEFAULT 'bag' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`moderation` text DEFAULT 'pending' NOT NULL,
	`active_claim_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `items_public` ON `items` (`moderation`,`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `notices` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`item_id` text,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`is_read` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `notices_user` ON `notices` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`password` text,
	`salt` text,
	`role` text DEFAULT 'student' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);