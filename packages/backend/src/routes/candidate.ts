import { Elysia, t } from "elysia";
import { createHash } from "node:crypto";
import { writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ResumeMatcher } from "@truthtalent/agents";
import { getCached, setCached } from "../services/cache.js";

const makeCacheKey = (namespace: string, payload: unknown): string => {
	const digest = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
	return `${namespace}:${digest}`;
};

export const candidateRoutes = new Elysia({ prefix: "/api/candidate" })
	.post(
		"/verify",
		async ({ body, status }) => {
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
		async ({ body }) => {
			return {
				success: true,
				data: {
					note: "Use /api/candidate/verify with repos + resume to run full evidence matching",
					input: body,
				},
			};
		},
		{
			body: t.Object({
				github_username: t.String({ minLength: 1 }),
				jd_text: t.String({ minLength: 3 }),
			}),
		}
	);

const resolveResumePath = async (resumePath?: string, resumeText?: string): Promise<string> => {
	if (resumePath) {
		return resumePath;
	}

	const fileName = `resume-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`;
	const path = join(tmpdir(), fileName);
	await writeFile(path, resumeText || "", "utf8");
	return path;
};
