import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const analysisCache = sqliteTable("analysis_cache", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	cache_key: text("cache_key").notNull().unique(),
	cache_type: text("cache_type").notNull(),
	data: text("data").notNull(),
	created_at: integer("created_at").notNull(),
	expires_at: integer("expires_at"),
});

export const jobPostings = sqliteTable("job_postings", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	user_id: text("user_id"),
	title: text("title").notNull(),
	jd_text: text("jd_text").notNull(),
	anonymized_jd: text("anonymized_jd"),
	required_skills: text("required_skills").notNull(),
	status: text("status").notNull().default("draft"),
	location: text("location"),
	employment_type: text("employment_type"),
	experience_level: text("experience_level"),
	created_at: integer("created_at").notNull(),
});

export const evaluations = sqliteTable("evaluations", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	job_posting_id: integer("job_posting_id"),
	github_username: text("github_username").notNull(),
	match_score: integer("match_score").notNull(),
	confidence: integer("confidence"),
	matched_count: integer("matched_count"),
	missing_count: integer("missing_count"),
	evaluation_data: text("evaluation_data").notNull(),
	trace_data: text("trace_data"),
	created_at: integer("created_at").notNull(),
});

export const candidateProfiles = sqliteTable("candidate_profiles", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	github_username: text("github_username").notNull(),
	profile_data: text("profile_data").notNull(),
	created_at: integer("created_at").notNull(),
});

export const users = sqliteTable("users", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	username: text("username").notNull().unique(),
	password_hash: text("password_hash").notNull(),
	role: text("role", { enum: ["recruiter", "candidate"] }).notNull(),
	created_at: integer("created_at").notNull(),
});

export const applications = sqliteTable("applications", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	job_posting_id: integer("job_posting_id").notNull(),
	candidate_username: text("candidate_username").notNull(),
	status: text("status").notNull().default("applied"),
	notes: text("notes"),
	created_at: integer("created_at").notNull(),
	updated_at: integer("updated_at").notNull(),
});

export const agentRuns = sqliteTable("agent_runs", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	evaluation_id: integer("evaluation_id").notNull(),
	run_type: text("run_type").notNull(),
	trace: text("trace").notNull(),
	created_at: integer("created_at").notNull(),
});
