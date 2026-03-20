import { Elysia, t } from "elysia";
import { createHash } from "node:crypto";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { and, desc, eq } from "drizzle-orm";
import { ResumeMatcher } from "@truthtalent/agents";
import { getCached, setCached } from "../services/cache.js";
import { db } from "../db/index.js";
import { applications, candidateProfiles, jobPostings } from "../db/schema.js";
import { hasGeminiApiKey } from "../services/env.js";

const makeCacheKey = (namespace: string, payload: unknown): string => {
	const digest = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
	return `${namespace}:${digest}`;
};

const resolveResumePath = async (resumePath?: string, resumeText?: string): Promise<string> => {
	if (resumePath) {
		return resumePath;
	}

	const fileName = `resume-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`;
	const path = join(tmpdir(), fileName);
	await writeFile(path, resumeText || "", "utf8");
	return path;
};

const safeParse = (value: string): Record<string, any> => {
	try {
		return JSON.parse(value);
	} catch {
		return {};
	}
};

export const candidateRoutes = new Elysia({ prefix: "/api/candidate" })
	.get(
		"/profiles/:username",
		async ({ params, status }) => {
			const rows = await db
				.select()
				.from(candidateProfiles)
				.where(eq(candidateProfiles.github_username, params.username))
				.orderBy(desc(candidateProfiles.created_at));

			if (rows.length === 0) {
				return status(404, {
					success: false,
					error: {
						code: "PROFILE_NOT_FOUND",
						message: "Candidate profile not found",
					},
				});
			}

			return {
				success: true,
				data: {
					github_username: params.username,
					latest_profile: safeParse(rows[0].profile_data),
					history: rows.map((row) => ({
						id: row.id,
						created_at: row.created_at,
						profile: safeParse(row.profile_data),
					})),
				},
			};
		},
		{
			params: t.Object({
				username: t.String({ minLength: 1 }),
			}),
		}
	)
	.get("/jobs", async () => {
		const rows = await db
			.select()
			.from(jobPostings)
			.where(eq(jobPostings.status, "published"))
			.orderBy(desc(jobPostings.created_at));

		return {
			success: true,
			data: rows.map((row) => {
				const meta = safeParse(row.required_skills);
				return {
					id: row.id,
					title: row.title,
					jd_text: row.anonymized_jd || row.jd_text,
					required_skills: meta.required_skills || {},
					location: row.location || "",
					employment_type: row.employment_type || "",
					experience_level: row.experience_level || "",
					created_at: row.created_at,
				};
			}),
		};
	})
	.get(
		"/jobs/:id",
		async ({ params, status }) => {
			const rows = await db.select().from(jobPostings).where(eq(jobPostings.id, Number(params.id))).limit(1);
			if (rows.length === 0) {
				return status(404, {
					success: false,
					error: {
						code: "JOB_NOT_FOUND",
						message: "Job not found",
					},
				});
			}

			const row = rows[0];
			const meta = safeParse(row.required_skills);
			return {
				success: true,
				data: {
					id: row.id,
					title: row.title,
					jd_text: row.anonymized_jd || row.jd_text,
					detailed_jd: row.jd_text,
					required_skills: meta.required_skills || {},
					location: row.location || "",
					employment_type: row.employment_type || "",
					experience_level: row.experience_level || "",
					created_at: row.created_at,
				},
			};
		},
		{
			params: t.Object({
				id: t.String({ minLength: 1 }),
			}),
		}
	)
	.get(
		"/applications",
		async ({ query }) => {
			const rows = await db
				.select()
				.from(applications)
				.where(eq(applications.candidate_username, query.username))
				.orderBy(desc(applications.updated_at));

			return {
				success: true,
				data: rows,
			};
		},
		{
			query: t.Object({
				username: t.String({ minLength: 1 }),
			}),
		}
	)
	.post(
		"/applications",
		async ({ body, status }) => {
			const jobRows = await db.select().from(jobPostings).where(eq(jobPostings.id, body.job_id)).limit(1);
			if (jobRows.length === 0) {
				return status(404, {
					success: false,
					error: {
						code: "JOB_NOT_FOUND",
						message: "Job not found",
					},
				});
			}

			const existing = await db
				.select()
				.from(applications)
				.where(and(eq(applications.job_posting_id, body.job_id), eq(applications.candidate_username, body.candidate_username)))
				.limit(1);

			if (existing.length > 0) {
				return status(409, {
					success: false,
					error: {
						code: "ALREADY_APPLIED",
						message: "Candidate has already applied to this job",
					},
				});
			}

			const now = Date.now();
			const inserted = await db
				.insert(applications)
				.values({
					job_posting_id: body.job_id,
					candidate_username: body.candidate_username,
					status: "applied",
					notes: body.notes || null,
					created_at: now,
					updated_at: now,
				})
				.returning({ id: applications.id });

			return {
				success: true,
				data: {
					id: inserted[0]?.id,
					job_id: body.job_id,
					candidate_username: body.candidate_username,
					status: "applied",
				},
			};
		},
		{
			body: t.Object({
				job_id: t.Number(),
				candidate_username: t.String({ minLength: 1 }),
				notes: t.Optional(t.String()),
			}),
		}
	)
	.post(
		"/verify",
		async ({ body, status }) => {
			if (!hasGeminiApiKey()) {
				return status(500, {
					success: false,
					error: {
						code: "MISSING_GOOGLE_API_KEY",
						message: "GOOGLE_API_KEY or GEMINI_API_KEY is required for candidate verification",
					},
				});
			}

			if (!body.resume_text && !body.resume_path) {
				return status(400, {
					success: false,
					error: {
						code: "INVALID_RESUME",
						message: "Provide either resume_text or resume_path",
					},
				});
			}

			const cacheKey = makeCacheKey("candidate-verify", body);
			const cached = await getCached<unknown>(cacheKey);
			if (cached) {
				return { success: true, data: cached, cached: true };
			}

			const matcher = new ResumeMatcher();
			const resumePath = await resolveResumePath(body.resume_path, body.resume_text);
			try {
				const report = await matcher.generateReport({
					resumePath,
					repos: body.repos,
					targetRole: body.target_role,
					githubUsername: body.github_username,
				});

				await db.insert(candidateProfiles).values({
					github_username: body.github_username || report.candidate_name,
					profile_data: JSON.stringify(report),
					created_at: Date.now(),
				});

				if (report.explanation.startsWith("Error:")) {
					return status(502, {
						success: false,
						error: {
							code: "ANALYSIS_FAILED",
							message: "Candidate verification failed due to upstream model authentication/runtime error",
						},
					});
				}

				await setCached(cacheKey, "candidate", report);
				return { success: true, data: report, cached: false };
			} finally {
				if (body.resume_text) {
					await unlink(resumePath).catch(() => undefined);
				}
			}
		},
		{
			body: t.Object({
				repos: t.Array(t.String({ minLength: 3 })),
				target_role: t.Optional(t.String({ minLength: 2 })),
				github_username: t.Optional(t.String({ minLength: 1 })),
				resume_path: t.Optional(t.String({ minLength: 3 })),
				resume_text: t.Optional(t.String({ minLength: 3 })),
			}),
		}
	)
	.post(
		"/match",
		async ({ body, status }) => {
			if (!hasGeminiApiKey()) {
				return status(500, {
					success: false,
					error: {
						code: "MISSING_GOOGLE_API_KEY",
						message: "GOOGLE_API_KEY or GEMINI_API_KEY is required for candidate matching",
					},
				});
			}

			if (!body.resume_text && !body.resume_path) {
				return status(400, {
					success: false,
					error: {
						code: "INVALID_RESUME",
						message: "Provide either resume_text or resume_path for agentic match",
					},
				});
			}

			const cacheKey = makeCacheKey("candidate-match", body);
			const cached = await getCached<unknown>(cacheKey);
			if (cached) {
				return { success: true, data: cached, cached: true };
			}

			const matcher = new ResumeMatcher();
			const resumePath = await resolveResumePath(body.resume_path, body.resume_text);
			let report;
			try {
				report = await matcher.generateReport({
					resumePath,
					repos: body.repos,
					targetRole: body.jd_text,
					githubUsername: body.github_username,
				});
			} finally {
				if (body.resume_text) {
					await unlink(resumePath).catch(() => undefined);
				}
			}

			if (report.explanation.startsWith("Error:")) {
				return status(502, {
					success: false,
					error: {
						code: "ANALYSIS_FAILED",
						message: "Candidate match failed due to upstream model authentication/runtime error",
					},
				});
			}

			const responseData = {
				match_score: report.overall_match_score,
				fit_level:
					report.overall_match_score >= 85
						? "excellent"
						: report.overall_match_score >= 70
							? "good"
							: report.overall_match_score >= 50
								? "fair"
								: "poor",
				matched_skills: report.verified_skills.concat(report.partially_verified_skills).map((skill) => ({
					skill: skill.skill,
					required_level: "intermediate",
					candidate_level: skill.confidence === "high" ? "expert" : skill.confidence === "medium" ? "intermediate" : "beginner",
					match: true,
				})),
				missing_skills: report.missing_for_role.map((skill) => ({
					skill,
					importance: "required",
					learning_distance: "medium",
				})),
				reasoning: report.explanation,
				recommendations: {
					should_apply: report.recommendation === "strong_yes" || report.recommendation === "yes",
					strengths: report.github_strengths,
					areas_to_improve: report.missing_for_role,
				},
				agentic_report: report,
			};

			await setCached(cacheKey, "candidate-match", responseData);
			return {
				success: true,
				data: responseData,
				cached: false,
			};
		},
		{
			body: t.Object({
				repos: t.Array(t.String({ minLength: 3 })),
				github_username: t.Optional(t.String({ minLength: 1 })),
				jd_text: t.String({ minLength: 3 }),
				resume_path: t.Optional(t.String({ minLength: 3 })),
				resume_text: t.Optional(t.String({ minLength: 3 })),
			}),
		}
	);
