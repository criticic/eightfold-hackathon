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
	required_skills: text("required_skills").notNull(),
	created_at: integer("created_at").notNull(),
});

export const evaluations = sqliteTable("evaluations", {
	id: integer("id").primaryKey({ autoIncrement: true }),
	job_posting_id: integer("job_posting_id"),
	github_username: text("github_username").notNull(),
	match_score: integer("match_score").notNull(),
	evaluation_data: text("evaluation_data").notNull(),
	created_at: integer("created_at").notNull(),
});
