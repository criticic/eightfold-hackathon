ALTER TABLE `job_postings` ADD `anonymized_jd` text;
--> statement-breakpoint
ALTER TABLE `job_postings` ADD `status` text DEFAULT 'draft' NOT NULL;
--> statement-breakpoint
ALTER TABLE `job_postings` ADD `location` text;
--> statement-breakpoint
ALTER TABLE `job_postings` ADD `employment_type` text;
--> statement-breakpoint
ALTER TABLE `job_postings` ADD `experience_level` text;
--> statement-breakpoint
ALTER TABLE `evaluations` ADD `confidence` integer;
--> statement-breakpoint
ALTER TABLE `evaluations` ADD `matched_count` integer;
--> statement-breakpoint
ALTER TABLE `evaluations` ADD `missing_count` integer;
--> statement-breakpoint
ALTER TABLE `evaluations` ADD `trace_data` text;
--> statement-breakpoint
CREATE TABLE `candidate_profiles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`github_username` text NOT NULL,
	`profile_data` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `applications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`job_posting_id` integer NOT NULL,
	`candidate_username` text NOT NULL,
	`status` text DEFAULT 'applied' NOT NULL,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `agent_runs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`evaluation_id` integer NOT NULL,
	`run_type` text NOT NULL,
	`trace` text NOT NULL,
	`created_at` integer NOT NULL
);
