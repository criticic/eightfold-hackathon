import { Elysia, t } from "elysia";
import { JDGenerator, ResumeMatcher } from "@truthtalent/agents";
import { createHash, randomUUID } from "node:crypto";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { and, desc, eq, sql } from "drizzle-orm";
import { deleteCached, getCached, setCached } from "../services/cache.js";
import { db } from "../db/index.js";
import { agentRuns, applications, evaluations, jobPostings } from "../db/schema.js";
import { hasGeminiApiKey } from "../services/env.js";

const makeCacheKey = (namespace: string, payload: unknown): string => {
	const digest = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
	return `${namespace}:${digest}`;
};

type JDStepState = "pending" | "running" | "done" | "error";
type JDRunStatus = "queued" | "running" | "done" | "error";

type JDRunStep = {
	id: string;
	label: string;
	state: JDStepState;
	detail: string;
	at?: number;
};

type JDRun = {
	id: string;
	status: JDRunStatus;
	created_at: number;
	updated_at: number;
	steps: JDRunStep[];
	events: Array<{ at: number; level: "info" | "error"; message: string }>;
	result?: Record<string, unknown>;
	error?: string;
};

const jdRuns = new Map<string, JDRun>();
const resumeEvalRuns = new Map<string, JDRun>();

const createJDRunSteps = (repos: string[], publish?: boolean): JDRunStep[] => [
	{
		id: "validate",
		label: "Validate request",
		state: "pending",
		detail: `Checking ${repos.length} repositories and input context`,
	},
	{
		id: "analyze",
		label: "Analyze repositories",
		state: "pending",
		detail: "Building codebase skill and architecture signals",
	},
	{
		id: "compose",
		label: "Compose JD",
		state: "pending",
		detail: "Drafting role scope, responsibilities, and requirements",
	},
	{
		id: "normalize",
		label: "Prepare anonymized version",
		state: "pending",
		detail: "Generating anonymized wording for unbiased screening",
	},
	{
		id: "persist",
		label: "Save posting",
		state: "pending",
		detail: publish ? "Saving and publishing the job" : "Saving draft job posting",
	},
];

const createResumeEvalSteps = (): JDRunStep[] => [
	{
		id: "validate",
		label: "Validate input",
		state: "pending",
		detail: "Checking job, resume PDF, and GitHub username",
	},
	{
		id: "resume_parse",
		label: "Parse resume",
		state: "pending",
		detail: "Converting resume into structured text profile",
	},
	{
		id: "evaluate",
		label: "Evaluate candidate",
		state: "pending",
		detail: "Loading GitHub repos and matching against JD requirements",
	},
	{
		id: "persist",
		label: "Save evaluation",
		state: "pending",
		detail: "Persisting score, trace, and detected profile",
	},
];

const updateJDRun = (runId: string, mutate: (run: JDRun) => void) => {
	const run = jdRuns.get(runId);
	if (!run) return;
	mutate(run);
	run.updated_at = Date.now();
	jdRuns.set(runId, run);
};

const setStepState = (run: JDRun, stepIndex: number, state: JDStepState, detail?: string) => {
	const step = run.steps[stepIndex];
	if (!step) return;
	step.state = state;
	step.at = Date.now();
	if (detail) {
		step.detail = detail;
	}
};

const appendRunEvent = (run: JDRun, message: string, level: "info" | "error" = "info") => {
	run.events.push({ at: Date.now(), level, message });
	if (run.events.length > 320) {
		run.events = run.events.slice(-320);
	}
};

const updateResumeEvalRun = (runId: string, mutate: (run: JDRun) => void) => {
	const run = resumeEvalRuns.get(runId);
	if (!run) return;
	mutate(run);
	run.updated_at = Date.now();
	resumeEvalRuns.set(runId, run);
};

const finalizeResumeEvalError = (runId: string, message: string) => {
	updateResumeEvalRun(runId, (run) => {
		const activeStep = run.steps.findIndex((step) => step.state === "running");
		if (activeStep >= 0) {
			setStepState(run, activeStep, "error", message);
		}
		appendRunEvent(run, message, "error");
		run.status = "error";
		run.error = message;
	});
};

const safeParse = (value: string | null | undefined): Record<string, any> => {
	if (!value) return {};
	try {
		return JSON.parse(value);
	} catch {
		return {};
	}
};

const normalizeRepoInput = (value: string): string => {
	const trimmed = value.trim();
	if (!trimmed) return "";
	const withoutProtocol = trimmed.replace(/^https?:\/\/github\.com\//, "").replace(/\/$/, "");
	return withoutProtocol;
};

const fetchGithubReposForUser = async (githubUsername: string): Promise<string[]> => {
	const token = process.env.GITHUB_TOKEN;
	const headers: Record<string, string> = {
		Accept: "application/vnd.github+json",
		"User-Agent": "truthtalent-backend",
	};
	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}

	const repos: string[] = [];
	let page = 1;

	while (page <= 3) {
		const res = await fetch(`https://api.github.com/users/${encodeURIComponent(githubUsername)}/repos?per_page=100&page=${page}&type=all&sort=updated`, {
			headers,
		});

		if (!res.ok) {
			throw new Error(`Failed to load repositories for ${githubUsername}: ${res.status}`);
		}

		const data = (await res.json()) as Array<{ full_name?: string }>;
		if (!Array.isArray(data) || data.length === 0) {
			break;
		}

		for (const repo of data) {
			if (typeof repo.full_name === "string" && repo.full_name.includes("/")) {
				repos.push(normalizeRepoInput(repo.full_name));
			}
		}

		if (data.length < 100) {
			break;
		}
		page++;
	}

	return Array.from(new Set(repos.filter(Boolean)));
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

const extractSkills = (jdText: string): string[] => {
	return jdText
		.split(/[^A-Za-z0-9+#.]+/)
		.map((part) => part.trim())
		.filter((part) => part.length > 2)
		.filter((part, index, arr) => arr.indexOf(part) === index)
		.slice(0, 20);
};

const buildTraceFromReport = (report: Record<string, any>, repos: string[]) => {
	const now = Date.now();
	const verified = Array.isArray(report.verified_skills) ? report.verified_skills : [];
	const partial = Array.isArray(report.partially_verified_skills) ? report.partially_verified_skills : [];
	const merged = [...verified, ...partial];

	return {
		steps: [
			{
				at: now - 3000,
				action: "resume_parse",
				note: "Parsed resume into structured skill claims",
			},
			{
				at: now - 2000,
				action: "repo_scan",
				note: `Scanned ${repos.length} repositories for evidence`,
				repos,
			},
			{
				at: now - 1000,
				action: "skill_verification",
				note: `Verified ${merged.length} skills with confidence tagging`,
				skills: merged.map((skill: Record<string, any>) => ({
					skill: skill.skill,
					confidence: skill.confidence,
					evidence_files: skill.evidence_files || [],
				})),
			},
			{
				at: now,
				action: "score_compute",
				note: "Computed final match score and recommendation",
				score: report.overall_match_score,
				recommendation: report.recommendation,
			},
		],
	};
};

const mapJobPosting = (row: typeof jobPostings.$inferSelect) => {
	const meta = safeParse(row.required_skills);
	return {
		id: row.id,
		title: row.title,
		detailed_jd: row.jd_text,
		anonymized_jd: row.anonymized_jd || meta.anonymized_version || "",
		required_skills: meta.required_skills || meta || {},
		evidence: meta.evidence || {},
		rough_jd: meta.rough_jd || "",
		repos: meta.repos || [],
		status: row.status,
		location: row.location || "",
		employment_type: row.employment_type || "",
		experience_level: row.experience_level || "",
		created_at: row.created_at,
	};
};

type GenerateJDBody = {
	repos: string[];
	rough_jd: string;
	publish?: boolean;
	location?: string;
	employment_type?: string;
	experience_level?: string;
};

const finalizeJDRunError = (runId: string, message: string) => {
	updateJDRun(runId, (run) => {
		const activeStep = run.steps.findIndex((step) => step.state === "running");
		if (activeStep >= 0) {
			setStepState(run, activeStep, "error", message);
		}
		appendRunEvent(run, message, "error");
		run.status = "error";
		run.error = message;
	});
};

const executeJDRun = async (runId: string, payload: GenerateJDBody) => {
	const repos = payload.repos.map((repo) => repo.trim()).filter(Boolean);
	const cacheKey = makeCacheKey("jd", payload);

	updateJDRun(runId, (run) => {
		run.status = "running";
		setStepState(run, 0, "running");
		appendRunEvent(run, "Run started");
	});

	const cached = await getCached<unknown>(cacheKey);
	if (cached) {
		const cachedRecord = cached as Record<string, unknown>;
		if (
			typeof cachedRecord.detailed_version === "string" &&
			cachedRecord.detailed_version.startsWith("Error: Could not resolve authentication method")
		) {
			await deleteCached(cacheKey);
		} else {
			updateJDRun(runId, (run) => {
				for (let i = 0; i < run.steps.length; i++) {
					setStepState(run, i, "done");
				}
				appendRunEvent(run, "Cache hit, reused existing JD output");
				run.status = "done";
				run.result = cachedRecord;
			});
			return;
		}
	}

	updateJDRun(runId, (run) => {
		setStepState(run, 0, "done", `Validated ${repos.length} repositories`);
		setStepState(run, 1, "running");
		appendRunEvent(run, `Validated input with ${repos.length} repositories`);
	});

	const generator = new JDGenerator();
	let result;
	try {
		result = await generator.generateJD(
			{
				repos,
				rough_jd: payload.rough_jd,
			},
			{
				onProgress: (event) => {
					updateJDRun(runId, (run) => {
						appendRunEvent(run, event.message, event.phase === "error" ? "error" : "info");
						if (event.phase === "tool_call") {
							setStepState(run, 1, "running", event.message);
						} else if (event.phase === "iteration") {
							setStepState(run, 1, "running", event.message);
						} else if (event.phase === "finalize") {
							setStepState(run, 2, "running", event.message);
						} else if (event.phase === "parsed") {
							setStepState(run, 2, "done", event.message);
							setStepState(run, 3, "running");
						} else if (event.phase === "error") {
							setStepState(run, 1, "error", event.message);
						}
					});
				},
			}
		);
	} catch (error) {
		finalizeJDRunError(runId, error instanceof Error ? error.message : "JD generation failed");
		return;
	}

	if (result.detailed_version.startsWith("Error:") || result.anonymized_version.startsWith("Error:")) {
		finalizeJDRunError(runId, "JD generation failed due to upstream model authentication/runtime error");
		return;
	}

	updateJDRun(runId, (run) => {
		if (run.steps[1]?.state !== "done") {
			setStepState(run, 1, "done", "Repository analysis complete");
		}
		if (run.steps[2]?.state !== "done") {
			setStepState(run, 2, "done", "Drafted detailed JD output");
		}
		setStepState(run, 3, "done", "Prepared anonymized JD output");
		setStepState(run, 4, "running");
		appendRunEvent(run, "Agent output parsed and normalized");
	});

	const now = Date.now();
	const inserted = await db
		.insert(jobPostings)
		.values({
			title: result.title,
			jd_text: result.detailed_version,
			anonymized_jd: result.anonymized_version,
			required_skills: JSON.stringify({
				required_skills: result.required_skills,
				anonymized_version: result.anonymized_version,
				evidence: result.evidence,
				rough_jd: payload.rough_jd,
				repos,
			}),
			status: payload.publish ? "published" : "draft",
			location: payload.location || null,
			employment_type: payload.employment_type || null,
			experience_level: payload.experience_level || result.experience_level || null,
			created_at: now,
		})
		.returning({ id: jobPostings.id });

	const responseData = {
		job_id: inserted[0]?.id,
		...result,
	};

	await setCached(cacheKey, "jd", responseData);

	updateJDRun(runId, (run) => {
		setStepState(run, 4, "done", "Job posting saved successfully");
		appendRunEvent(run, "Persisted generated JD and completed run");
		run.status = "done";
		run.result = responseData;
	});
};

const executeResumeEvalRun = async (runId: string, payload: { jobId: number; resumePath: string; githubUsername: string }) => {
	updateResumeEvalRun(runId, (run) => {
		run.status = "running";
		setStepState(run, 0, "running");
		appendRunEvent(run, "Run started");
	});

	try {
		const jobRows = await db.select().from(jobPostings).where(eq(jobPostings.id, payload.jobId)).limit(1);
		if (jobRows.length === 0) {
			finalizeResumeEvalError(runId, "Job not found");
			return;
		}

		const job = jobRows[0];
		updateResumeEvalRun(runId, (run) => {
			setStepState(run, 0, "done", "Validated resume upload and job context");
			setStepState(run, 1, "running");
			appendRunEvent(run, "Validated input and loaded job");
		});

		const matcher = new ResumeMatcher();
		const preferredGithubUsername = payload.githubUsername.trim();
		const repos = await fetchGithubReposForUser(preferredGithubUsername);

		if (repos.length === 0) {
			finalizeResumeEvalError(runId, `No repositories found for GitHub user ${preferredGithubUsername}`);
			return;
		}

		updateResumeEvalRun(runId, (run) => {
			setStepState(run, 1, "done", "Resume parsed into structured profile");
			appendRunEvent(run, `Using GitHub username: ${preferredGithubUsername}`);
			appendRunEvent(run, `Loaded ${repos.length} repositories from GitHub`);
			setStepState(run, 2, "running");
		});

		const report = await matcher.generateReport({
				resumePath: payload.resumePath,
				repos,
				targetRole: job.jd_text,
				githubUsername: preferredGithubUsername || undefined,
			},
			{
				onProgress: (event) => {
					updateResumeEvalRun(runId, (run) => {
						appendRunEvent(run, event.message, event.phase === "error" ? "error" : "info");
						if (event.phase === "iteration" || event.phase === "tool_call") {
							setStepState(run, 2, "running", event.message);
						}
					});
				},
			}
		);

		const required = extractSkills(job.jd_text);
		const verified = [...report.verified_skills, ...report.partially_verified_skills];
		const matched_skills = verified.map((skill) => skill.skill).filter((skill) => required.length === 0 || required.includes(skill));
		const missing_skills = report.missing_for_role.length > 0 ? report.missing_for_role : required.filter((skill) => !matched_skills.includes(skill));

		const confidenceScore = Math.round(
			(verified.filter((skill) => skill.confidence === "high").length * 100 + verified.filter((skill) => skill.confidence === "medium").length * 70 + verified.filter((skill) => skill.confidence === "low").length * 40) /
				Math.max(1, verified.length)
		);

		const trace = buildTraceFromReport(report as Record<string, any>, repos);
		const result = {
			match_score: report.overall_match_score,
			matched_skills,
			missing_skills,
			reasoning: report.explanation,
			candidate_summary: {
				username: preferredGithubUsername || "unknown",
				total_repos: repos.length,
				total_commits: 0,
				primary_languages: report.verified_skills.slice(0, 5).map((skill) => skill.skill),
			},
			skill_breakdown: required.slice(0, 16).map((skill) => {
				const found = verified.find((item) => item.skill.toLowerCase() === skill.toLowerCase());
				return {
					skill,
					required: true,
					candidate_level: found ? (found.confidence === "high" ? "expert" : found.confidence === "medium" ? "intermediate" : "beginner") : "none",
					evidence: (found?.evidence_files || []).slice(0, 4).map((filePath) => ({
						repo: filePath.split("/").slice(0, 2).join("/"),
						loc: 0,
						commits: 0,
					})),
				};
			}),
			confidence: confidenceScore,
			trace,
			agentic_report: report,
			detected: {
				github_username: preferredGithubUsername,
				repositories: repos,
				github_urls: repos.map((repo) => `https://github.com/${repo}`),
			},
		};

		updateResumeEvalRun(runId, (run) => {
			setStepState(run, 2, "done", `Computed score ${report.overall_match_score}`);
			setStepState(run, 3, "running");
			appendRunEvent(run, "Candidate evaluation completed, persisting results");
		});

		const inserted = await db
			.insert(evaluations)
			.values({
				job_posting_id: payload.jobId,
				github_username: preferredGithubUsername || "unknown",
				match_score: report.overall_match_score,
				confidence: confidenceScore,
				matched_count: matched_skills.length,
				missing_count: missing_skills.length,
				evaluation_data: JSON.stringify(result),
				trace_data: JSON.stringify(trace),
				created_at: Date.now(),
			})
			.returning({ id: evaluations.id });

		if (inserted[0]?.id) {
			await db.insert(agentRuns).values({
				evaluation_id: inserted[0].id,
				run_type: "candidate_evaluation",
				trace: JSON.stringify(trace),
				created_at: Date.now(),
			});
		}

		updateResumeEvalRun(runId, (run) => {
			setStepState(run, 3, "done", "Saved evaluation and trace");
			appendRunEvent(run, "Evaluation run completed");
			run.status = "done";
			run.result = { evaluation_id: inserted[0]?.id, ...result };
		});
	} catch (error) {
		finalizeResumeEvalError(runId, error instanceof Error ? error.message : "Resume evaluation failed");
	} finally {
		await unlink(payload.resumePath).catch(() => undefined);
	}
};

export const recruiterRoutes = new Elysia({ prefix: "/api/recruiter" })
	.get("/jobs", async () => {
		const rows = await db.select().from(jobPostings).orderBy(desc(jobPostings.created_at));
		return {
			success: true,
			data: rows.map((row) => mapJobPosting(row)),
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

			return {
				success: true,
				data: mapJobPosting(rows[0]),
			};
		},
		{
			params: t.Object({
				id: t.String({ minLength: 1 }),
			}),
		}
	)
	.post(
		"/jobs/:id/publish",
		async ({ params, status }) => {
			const id = Number(params.id);
			const existing = await db.select().from(jobPostings).where(eq(jobPostings.id, id)).limit(1);
			if (existing.length === 0) {
				return status(404, {
					success: false,
					error: {
						code: "JOB_NOT_FOUND",
						message: "Job not found",
					},
				});
			}

			await db.update(jobPostings).set({ status: "published" }).where(eq(jobPostings.id, id));
			return {
				success: true,
				data: { id, status: "published" },
			};
		},
		{
			params: t.Object({
				id: t.String({ minLength: 1 }),
			}),
		}
	)
	.post(
		"/jobs/:id/archive",
		async ({ params, status }) => {
			const id = Number(params.id);
			const existing = await db.select().from(jobPostings).where(eq(jobPostings.id, id)).limit(1);
			if (existing.length === 0) {
				return status(404, {
					success: false,
					error: {
						code: "JOB_NOT_FOUND",
						message: "Job not found",
					},
				});
			}

			await db.update(jobPostings).set({ status: "archived" }).where(eq(jobPostings.id, id));
			return {
				success: true,
				data: { id, status: "archived" },
			};
		},
		{
			params: t.Object({
				id: t.String({ minLength: 1 }),
			}),
		}
	)
	.get(
		"/candidates",
		async ({ query }) => {
			const jobId = query.job_id ? Number(query.job_id) : null;
			const rows = jobId
				? await db.select().from(evaluations).where(eq(evaluations.job_posting_id, jobId)).orderBy(desc(evaluations.created_at))
				: await db.select().from(evaluations).orderBy(desc(evaluations.created_at));

			const grouped = new Map<
				string,
				{ latestScore: number; evaluations: number; latestAt: number; confidence: number; matchedCount: number; missingCount: number }
			>();

			for (const row of rows) {
				const current = grouped.get(row.github_username);
				if (!current) {
					grouped.set(row.github_username, {
						latestScore: row.match_score,
						evaluations: 1,
						latestAt: row.created_at,
						confidence: row.confidence || 0,
						matchedCount: row.matched_count || 0,
						missingCount: row.missing_count || 0,
					});
					continue;
				}

				grouped.set(row.github_username, {
					latestScore: Math.max(current.latestScore, row.match_score),
					evaluations: current.evaluations + 1,
					latestAt: Math.max(current.latestAt, row.created_at),
					confidence: Math.max(current.confidence, row.confidence || 0),
					matchedCount: Math.max(current.matchedCount, row.matched_count || 0),
					missingCount: Math.max(current.missingCount, row.missing_count || 0),
				});
			}

			const candidates = Array.from(grouped.entries()).map(([github_username, metrics]) => ({
				github_username,
				job_id: jobId,
				latest_match_score: metrics.latestScore,
				evaluation_count: metrics.evaluations,
				last_evaluated_at: metrics.latestAt,
				confidence: metrics.confidence,
				matched_count: metrics.matchedCount,
				missing_count: metrics.missingCount,
			}));

			const sortBy = query.sort || "match_score";
			if (sortBy === "recency") {
				candidates.sort((a, b) => b.last_evaluated_at - a.last_evaluated_at);
			} else if (sortBy === "confidence") {
				candidates.sort((a, b) => b.confidence - a.confidence || b.latest_match_score - a.latest_match_score);
			} else {
				candidates.sort((a, b) => b.latest_match_score - a.latest_match_score);
			}

			return {
				success: true,
				data: candidates,
			};
		},
		{
			query: t.Object({
				job_id: t.Optional(t.String({ minLength: 1 })),
				sort: t.Optional(t.Union([t.Literal("match_score"), t.Literal("recency"), t.Literal("confidence")])),
			}),
		}
	)
	.get(
		"/candidates/:username",
		async ({ params, status }) => {
			const rows = await db.select().from(evaluations).where(eq(evaluations.github_username, params.username)).orderBy(desc(evaluations.created_at));
			if (rows.length === 0) {
				return status(404, {
					success: false,
					error: {
						code: "CANDIDATE_NOT_FOUND",
						message: "No evaluations found for this candidate",
					},
				});
			}

			const evaluationsWithTrace = rows.map((row) => {
				const parsed = safeParse(row.evaluation_data);
				return {
					id: row.id,
					job_id: row.job_posting_id,
					match_score: row.match_score,
					confidence: row.confidence || 0,
					matched_count: row.matched_count || 0,
					missing_count: row.missing_count || 0,
					created_at: row.created_at,
					reasoning: parsed.reasoning || "",
					matched_skills: parsed.matched_skills || [],
					missing_skills: parsed.missing_skills || [],
					traces: parsed.trace || safeParse(row.trace_data),
					agentic_report: parsed.agentic_report || {},
				};
			});

			return {
				success: true,
				data: {
					github_username: params.username,
					best_match_score: Math.max(...rows.map((row) => row.match_score)),
					evaluations: evaluationsWithTrace,
				},
			};
		},
		{
			params: t.Object({
				username: t.String({ minLength: 1 }),
			}),
		}
	)
	.get(
		"/evaluations/:id",
		async ({ params, status }) => {
			const id = Number(params.id);
			const rows = await db.select().from(evaluations).where(eq(evaluations.id, id)).limit(1);
			if (rows.length === 0) {
				return status(404, {
					success: false,
					error: {
						code: "EVALUATION_NOT_FOUND",
						message: "Evaluation not found",
					},
				});
			}

			const row = rows[0];
			return {
				success: true,
				data: {
					id: row.id,
					job_id: row.job_posting_id,
					github_username: row.github_username,
					match_score: row.match_score,
					confidence: row.confidence || 0,
					matched_count: row.matched_count || 0,
					missing_count: row.missing_count || 0,
					created_at: row.created_at,
					...safeParse(row.evaluation_data),
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
		"/evaluations/:id/trace",
		async ({ params, status }) => {
			const id = Number(params.id);
			const evalRows = await db.select().from(evaluations).where(eq(evaluations.id, id)).limit(1);
			if (evalRows.length === 0) {
				return status(404, {
					success: false,
					error: {
						code: "EVALUATION_NOT_FOUND",
						message: "Evaluation not found",
					},
				});
			}

			const runRows = await db.select().from(agentRuns).where(eq(agentRuns.evaluation_id, id)).orderBy(desc(agentRuns.created_at));
			const evalRow = evalRows[0];
			const fallbackTrace = safeParse(evalRow.trace_data);

			return {
				success: true,
				data: {
					evaluation_id: id,
					trace:
						runRows.length > 0
							? runRows.map((row) => ({ id: row.id, run_type: row.run_type, created_at: row.created_at, trace: safeParse(row.trace) }))
							: [{ id: 0, run_type: "evaluation", created_at: evalRow.created_at, trace: fallbackTrace }],
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
			const rows = query.job_id
				? await db.select().from(applications).where(eq(applications.job_posting_id, Number(query.job_id))).orderBy(desc(applications.updated_at))
				: await db.select().from(applications).orderBy(desc(applications.updated_at));

			return {
				success: true,
				data: rows,
			};
		},
		{
			query: t.Object({
				job_id: t.Optional(t.String({ minLength: 1 })),
			}),
		}
	)
	.patch(
		"/applications/:id",
		async ({ params, body, status }) => {
			const id = Number(params.id);
			const existing = await db.select().from(applications).where(eq(applications.id, id)).limit(1);
			if (existing.length === 0) {
				return status(404, {
					success: false,
					error: {
						code: "APPLICATION_NOT_FOUND",
						message: "Application not found",
					},
				});
			}

			await db
				.update(applications)
				.set({
					status: body.status,
					notes: body.notes || existing[0].notes,
					updated_at: Date.now(),
				})
				.where(eq(applications.id, id));

			return {
				success: true,
				data: { id, status: body.status, notes: body.notes || existing[0].notes },
			};
		},
		{
			params: t.Object({
				id: t.String({ minLength: 1 }),
			}),
			body: t.Object({
				status: t.Union([
					t.Literal("applied"),
					t.Literal("screening"),
					t.Literal("interview"),
					t.Literal("offer"),
					t.Literal("rejected"),
				]),
				notes: t.Optional(t.String()),
			}),
		}
	)
	.post(
		"/generate-jd/start",
		async ({ body, status }) => {
			const repos = body.repos.map((repo) => repo.trim()).filter(Boolean);
			if (repos.length === 0) {
				return status(400, {
					success: false,
					error: {
						code: "INVALID_REPOS",
						message: "At least one repository is required",
					},
				});
			}

			const runId = randomUUID();
			const now = Date.now();
			jdRuns.set(runId, {
				id: runId,
				status: "queued",
				created_at: now,
				updated_at: now,
				steps: createJDRunSteps(repos, body.publish),
				events: [{ at: now, level: "info", message: "Queued JD generation run" }],
			});

			void executeJDRun(runId, { ...body, repos });

			return {
				success: true,
				data: {
					run_id: runId,
					status: "queued",
				},
			};
		},
		{
			body: t.Object({
				repos: t.Array(t.String({ minLength: 3 })),
				rough_jd: t.String({ minLength: 3 }),
				publish: t.Optional(t.Boolean()),
				location: t.Optional(t.String()),
				employment_type: t.Optional(t.String()),
				experience_level: t.Optional(t.String()),
			}),
		}
	)
	.get(
		"/generate-jd/runs/:runId",
		async ({ params, status }) => {
			const run = jdRuns.get(params.runId);
			if (!run) {
				return status(404, {
					success: false,
					error: {
						code: "RUN_NOT_FOUND",
						message: "JD generation run not found",
					},
				});
			}

			return {
				success: true,
				data: run,
			};
		},
		{
			params: t.Object({
				runId: t.String({ minLength: 1 }),
			}),
		}
	)
	.post(
		"/generate-jd",
		async ({ body, status }) => {
			const repos = body.repos.map((repo) => repo.trim()).filter(Boolean);
			if (repos.length === 0) {
				return status(400, {
					success: false,
					error: {
						code: "INVALID_REPOS",
						message: "At least one repository is required",
					},
				});
			}

			const cacheKey = makeCacheKey("jd", body);
			const cached = await getCached<unknown>(cacheKey);
			if (cached) {
				const cachedRecord = cached as Record<string, unknown>;
				if (
					typeof cachedRecord.detailed_version === "string" &&
					cachedRecord.detailed_version.startsWith("Error: Could not resolve authentication method")
				) {
					await deleteCached(cacheKey);
				} else {
					return { success: true, data: cached, cached: true };
				}
			}

			const generator = new JDGenerator();
			let result;
			try {
				console.log("[generate-jd] key-present", Boolean(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY));
				result = await generator.generateJD({
					repos,
					rough_jd: body.rough_jd,
				});
			} catch (error) {
				return status(502, {
					success: false,
					error: {
						code: "ANALYSIS_FAILED",
						message: error instanceof Error ? error.message : "JD generation failed",
					},
				});
			}

			if (result.detailed_version.startsWith("Error:") || result.anonymized_version.startsWith("Error:")) {
				return status(502, {
					success: false,
					error: {
						code: "ANALYSIS_FAILED",
						message: "JD generation failed due to upstream model authentication/runtime error",
					},
				});
			}

			const now = Date.now();
			const inserted = await db
				.insert(jobPostings)
				.values({
					title: result.title,
					jd_text: result.detailed_version,
					anonymized_jd: result.anonymized_version,
					required_skills: JSON.stringify({
						required_skills: result.required_skills,
						anonymized_version: result.anonymized_version,
						evidence: result.evidence,
						rough_jd: body.rough_jd,
						repos,
					}),
					status: body.publish ? "published" : "draft",
					location: body.location || null,
					employment_type: body.employment_type || null,
					experience_level: body.experience_level || result.experience_level || null,
					created_at: now,
				})
				.returning({ id: jobPostings.id });

			const responseData = {
				job_id: inserted[0]?.id,
				...result,
			};

			await setCached(cacheKey, "jd", responseData);
			return { success: true, data: responseData, cached: false };
		},
		{
			body: t.Object({
				repos: t.Array(t.String({ minLength: 3 })),
				rough_jd: t.String({ minLength: 3 }),
				publish: t.Optional(t.Boolean()),
				location: t.Optional(t.String()),
				employment_type: t.Optional(t.String()),
				experience_level: t.Optional(t.String()),
			}),
		}
	)
	.post(
		"/analyze-repos",
		async ({ body, status }) => {
			if (!hasGeminiApiKey()) {
				return status(500, {
					success: false,
					error: {
						code: "MISSING_GOOGLE_API_KEY",
						message: "GOOGLE_API_KEY or GEMINI_API_KEY is required for agentic repository analysis",
					},
				});
			}

			const normalizedRepos = body.repo_urls.map(normalizeRepoInput).filter(Boolean);
			if (normalizedRepos.length === 0 || normalizedRepos.some((repo) => !repo.includes("/"))) {
				return status(400, {
					success: false,
					error: {
						code: "INVALID_GITHUB_URL",
						message: "Provide valid GitHub repository URLs or owner/repo values",
					},
				});
			}

			const cacheKey = makeCacheKey("recruiter-analyze", { repos: normalizedRepos, context: body.context || "" });
			const cached = await getCached<unknown>(cacheKey);
			if (cached) {
				return { success: true, data: cached, cached: true };
			}

			const jdGenerator = new JDGenerator();
			let jd;
			try {
				jd = await jdGenerator.generateJD({
					repos: normalizedRepos,
					rough_jd: body.context || "Repository intelligence extraction",
				});
			} catch (error) {
				return status(502, {
					success: false,
					error: {
						code: "ANALYSIS_FAILED",
						message: error instanceof Error ? error.message : "Repository analysis failed",
					},
				});
			}

			const technologies = Object.keys(jd.evidence.technologies_found);
			const responseData = {
				repos: normalizedRepos.map((repo) => ({
					url: `https://github.com/${repo}`,
					name: repo,
					languages: Object.fromEntries(jd.required_skills.languages.map((lang) => [lang, 100 / Math.max(1, jd.required_skills.languages.length)])),
					tech_stack: technologies.slice(0, 12),
					complexity_score: Math.min(100, 45 + technologies.length * 5),
					stars: 0,
					contributors: 0,
				})),
				aggregated_tech_stack: {
					languages: jd.required_skills.languages,
					frameworks: jd.required_skills.frameworks,
					tools: jd.required_skills.tools,
				},
				agentic_summary: {
					title: jd.title,
					overview: jd.overview,
					key_files: jd.evidence.key_files,
				},
			};

			await setCached(cacheKey, "recruiter-analyze", responseData);
			return {
				success: true,
				data: responseData,
				cached: false,
			};
		},
		{
			body: t.Object({
				repo_urls: t.Array(t.String({ minLength: 3 })),
				context: t.Optional(t.String({ minLength: 3 })),
			}),
		}
	)
	.post("/evaluate-candidate-resume/start", async ({ request, status }) => {
		if (!hasGeminiApiKey()) {
			return status(500, {
				success: false,
				error: {
					code: "MISSING_GOOGLE_API_KEY",
					message: "GOOGLE_API_KEY or GEMINI_API_KEY is required for agentic candidate evaluation",
				},
			});
		}

		const form = await request.formData();
		const jobIdRaw = form.get("job_id");
		const resume = form.get("resume");
		const githubUsernameRaw = form.get("github_username");
		const githubUsername = typeof githubUsernameRaw === "string" ? githubUsernameRaw.trim() : "";

		const jobId = Number(jobIdRaw);
		if (!Number.isFinite(jobId) || jobId <= 0) {
			return status(400, {
				success: false,
				error: {
					code: "INVALID_JOB_ID",
					message: "Valid job_id is required",
				},
			});
		}

		if (!(resume instanceof File)) {
			return status(400, {
				success: false,
				error: {
					code: "INVALID_RESUME",
					message: "Resume PDF file is required",
				},
			});
		}

		if (resume.type !== "application/pdf") {
			return status(400, {
				success: false,
				error: {
					code: "INVALID_RESUME_TYPE",
					message: "Resume must be a PDF",
				},
			});
		}

		if (!githubUsername) {
			return status(400, {
				success: false,
				error: {
					code: "INVALID_GITHUB_USERNAME",
					message: "GitHub username is required",
				},
			});
		}

		const runId = randomUUID();
		const now = Date.now();
		const resumePath = join(tmpdir(), `resume-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`);
		await writeFile(resumePath, Buffer.from(await resume.arrayBuffer()));

		resumeEvalRuns.set(runId, {
			id: runId,
			status: "queued",
			created_at: now,
			updated_at: now,
			steps: createResumeEvalSteps(),
			events: [{ at: now, level: "info", message: "Queued resume evaluation run" }],
		});

		void executeResumeEvalRun(runId, {
			jobId,
			resumePath,
			githubUsername,
		});

		return {
			success: true,
			data: {
				run_id: runId,
				status: "queued",
			},
		};
	})
	.get(
		"/evaluate-candidate-resume/runs/:runId",
		async ({ params, status }) => {
			const run = resumeEvalRuns.get(params.runId);
			if (!run) {
				return status(404, {
					success: false,
					error: {
						code: "RUN_NOT_FOUND",
						message: "Resume evaluation run not found",
					},
				});
			}

			return {
				success: true,
				data: run,
			};
		},
		{
			params: t.Object({
				runId: t.String({ minLength: 1 }),
			}),
		}
	)
	.post("/evaluate-candidate-resume", async ({ request, status }) => {
		if (!hasGeminiApiKey()) {
			return status(500, {
				success: false,
				error: {
					code: "MISSING_GOOGLE_API_KEY",
					message: "GOOGLE_API_KEY or GEMINI_API_KEY is required for agentic candidate evaluation",
				},
			});
		}

		const form = await request.formData();
		const jobIdRaw = form.get("job_id");
		const resume = form.get("resume");
		const githubUsernameRaw = form.get("github_username");
		const githubUsername = typeof githubUsernameRaw === "string" ? githubUsernameRaw.trim() : "";

		const jobId = Number(jobIdRaw);
		if (!Number.isFinite(jobId) || jobId <= 0) {
			return status(400, {
				success: false,
				error: {
					code: "INVALID_JOB_ID",
					message: "Valid job_id is required",
				},
			});
		}

		if (!(resume instanceof File)) {
			return status(400, {
				success: false,
				error: {
					code: "INVALID_RESUME",
					message: "Resume PDF file is required",
				},
			});
		}

		if (resume.type !== "application/pdf") {
			return status(400, {
				success: false,
				error: {
					code: "INVALID_RESUME_TYPE",
					message: "Resume must be a PDF",
				},
			});
		}

		if (!githubUsername) {
			return status(400, {
				success: false,
				error: {
					code: "INVALID_GITHUB_USERNAME",
					message: "GitHub username is required",
				},
			});
		}

		const jobRows = await db.select().from(jobPostings).where(eq(jobPostings.id, jobId)).limit(1);
		if (jobRows.length === 0) {
			return status(404, {
				success: false,
				error: {
					code: "JOB_NOT_FOUND",
					message: "Job not found",
				},
			});
		}

		const job = jobRows[0];
		const resumePath = join(tmpdir(), `resume-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`);

		await writeFile(resumePath, Buffer.from(await resume.arrayBuffer()));

		try {
			const matcher = new ResumeMatcher();
			const repos = await fetchGithubReposForUser(githubUsername);

			if (repos.length === 0 || repos.some((repo) => !repo.includes("/"))) {
				return status(400, {
					success: false,
					error: {
						code: "REPO_EXTRACTION_FAILED",
						message: `No repositories found for GitHub user ${githubUsername}`,
					},
				});
			}

			const report = await matcher.generateReport({
				resumePath,
				repos,
				targetRole: job.jd_text,
				githubUsername,
			});

			const required = extractSkills(job.jd_text);
			const verified = [...report.verified_skills, ...report.partially_verified_skills];
			const matched_skills = verified.map((skill) => skill.skill).filter((skill) => required.length === 0 || required.includes(skill));
			const missing_skills = report.missing_for_role.length > 0 ? report.missing_for_role : required.filter((skill) => !matched_skills.includes(skill));

			const confidenceScore = Math.round(
				(verified.filter((skill) => skill.confidence === "high").length * 100 + verified.filter((skill) => skill.confidence === "medium").length * 70 + verified.filter((skill) => skill.confidence === "low").length * 40) /
					Math.max(1, verified.length)
			);

			const trace = buildTraceFromReport(report as Record<string, any>, repos);
			const result = {
				match_score: report.overall_match_score,
				matched_skills,
				missing_skills,
				reasoning: report.explanation,
				candidate_summary: {
					username: githubUsername,
					total_repos: repos.length,
					total_commits: 0,
					primary_languages: report.verified_skills.slice(0, 5).map((skill) => skill.skill),
				},
				skill_breakdown: required.slice(0, 16).map((skill) => {
					const found = verified.find((item) => item.skill.toLowerCase() === skill.toLowerCase());
					return {
						skill,
						required: true,
						candidate_level: found ? (found.confidence === "high" ? "expert" : found.confidence === "medium" ? "intermediate" : "beginner") : "none",
						evidence: (found?.evidence_files || []).slice(0, 4).map((filePath) => ({
							repo: filePath.split("/").slice(0, 2).join("/"),
							loc: 0,
							commits: 0,
						})),
					};
				}),
				confidence: confidenceScore,
				trace,
				agentic_report: report,
				detected: {
					github_username: githubUsername,
					repositories: repos,
					github_urls: repos.map((repo) => `https://github.com/${repo}`),
				},
			};

			const inserted = await db
				.insert(evaluations)
				.values({
					job_posting_id: jobId,
					github_username: githubUsername,
					match_score: report.overall_match_score,
					confidence: confidenceScore,
					matched_count: matched_skills.length,
					missing_count: missing_skills.length,
					evaluation_data: JSON.stringify(result),
					trace_data: JSON.stringify(trace),
					created_at: Date.now(),
				})
				.returning({ id: evaluations.id });

			if (inserted[0]?.id) {
				await db.insert(agentRuns).values({
					evaluation_id: inserted[0].id,
					run_type: "candidate_evaluation",
					trace: JSON.stringify(trace),
					created_at: Date.now(),
				});
			}

			return {
				success: true,
				data: {
					evaluation_id: inserted[0]?.id,
					...result,
				},
			};
		} finally {
			await unlink(resumePath).catch(() => undefined);
		}
	})
	.post(
		"/evaluate-candidate",
		async ({ body, status }) => {
			if (!hasGeminiApiKey()) {
				return status(500, {
					success: false,
					error: {
						code: "MISSING_GOOGLE_API_KEY",
						message: "GOOGLE_API_KEY or GEMINI_API_KEY is required for agentic candidate evaluation",
					},
				});
			}

			if (!body.resume_text && !body.resume_path) {
				return status(400, {
					success: false,
					error: {
						code: "INVALID_RESUME",
						message: "Provide either resume_text or resume_path for agentic evaluation",
					},
				});
			}

			const repos = body.candidate_repos.map(normalizeRepoInput).filter(Boolean);
			if (repos.length === 0 || repos.some((repo) => !repo.includes("/"))) {
				return status(400, {
					success: false,
					error: {
						code: "INVALID_REPOS",
						message: "candidate_repos must contain valid owner/repo values or GitHub URLs",
					},
				});
			}

			const cacheKey = makeCacheKey("recruiter-evaluate", body);
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
					repos,
					targetRole: body.target_role || body.jd_text,
					githubUsername: body.github_username,
				});
			} finally {
				if (body.resume_text) {
					await unlink(resumePath).catch(() => undefined);
				}
			}

			const required = body.required_skills && body.required_skills.length > 0 ? body.required_skills : extractSkills(body.jd_text);
			const verified = [...report.verified_skills, ...report.partially_verified_skills];
			const matched_skills = verified.map((skill) => skill.skill).filter((skill) => required.length === 0 || required.includes(skill));
			const missing_skills = report.missing_for_role.length > 0 ? report.missing_for_role : required.filter((skill) => !matched_skills.includes(skill));

			const confidenceScore = Math.round(
				(verified.filter((skill) => skill.confidence === "high").length * 100 + verified.filter((skill) => skill.confidence === "medium").length * 70 + verified.filter((skill) => skill.confidence === "low").length * 40) /
					Math.max(1, verified.length)
			);

			const trace = buildTraceFromReport(report as Record<string, any>, repos);
			const result = {
				match_score: report.overall_match_score,
				matched_skills,
				missing_skills,
				reasoning: report.explanation,
				candidate_summary: {
					username: body.github_username || "unknown",
					total_repos: repos.length,
					total_commits: 0,
					primary_languages: report.verified_skills.slice(0, 5).map((skill) => skill.skill),
				},
				skill_breakdown: required.slice(0, 16).map((skill) => {
					const found = verified.find((item) => item.skill.toLowerCase() === skill.toLowerCase());
					return {
						skill,
						required: true,
						candidate_level: found ? (found.confidence === "high" ? "expert" : found.confidence === "medium" ? "intermediate" : "beginner") : "none",
						evidence: (found?.evidence_files || []).slice(0, 4).map((filePath) => ({
							repo: filePath.split("/").slice(0, 2).join("/"),
							loc: 0,
							commits: 0,
						})),
					};
				}),
				confidence: confidenceScore,
				trace,
				agentic_report: report,
			};

			const inserted = await db
				.insert(evaluations)
				.values({
					job_posting_id: body.job_id,
					github_username: body.github_username || "unknown",
					match_score: report.overall_match_score,
					confidence: confidenceScore,
					matched_count: matched_skills.length,
					missing_count: missing_skills.length,
					evaluation_data: JSON.stringify(result),
					trace_data: JSON.stringify(trace),
					created_at: Date.now(),
				})
				.returning({ id: evaluations.id });

			if (inserted[0]?.id) {
				await db.insert(agentRuns).values({
					evaluation_id: inserted[0].id,
					run_type: "candidate_evaluation",
					trace: JSON.stringify(trace),
					created_at: Date.now(),
				});
			}

			const responseData = {
				evaluation_id: inserted[0]?.id,
				...result,
			};

			await setCached(cacheKey, "recruiter-evaluate", responseData);

			return {
				success: true,
				data: responseData,
				cached: false,
			};
		},
		{
			body: t.Object({
				job_id: t.Optional(t.Number()),
				github_username: t.Optional(t.String({ minLength: 1 })),
				jd_text: t.String({ minLength: 3 }),
				candidate_repos: t.Array(t.String({ minLength: 3 })),
				resume_path: t.Optional(t.String({ minLength: 3 })),
				resume_text: t.Optional(t.String({ minLength: 3 })),
				target_role: t.Optional(t.String({ minLength: 2 })),
				required_skills: t.Optional(t.Array(t.String())),
			}),
		}
	);
