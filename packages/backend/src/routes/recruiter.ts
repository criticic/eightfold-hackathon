import { Elysia, t } from "elysia";
import { JDGenerator } from "@truthtalent/agents";
import { createHash } from "node:crypto";
import { getCached, setCached } from "../services/cache.js";

const makeCacheKey = (namespace: string, payload: unknown): string => {
	const digest = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
	return `${namespace}:${digest}`;
};

export const recruiterRoutes = new Elysia({ prefix: "/api/recruiter" })
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
				return { success: true, data: cached, cached: true };
			}

			const generator = new JDGenerator();
			const result = await generator.generateJD({
				repos,
				rough_jd: body.rough_jd,
			});

			await setCached(cacheKey, "jd", result);
			return { success: true, data: result, cached: false };
		},
		{
			body: t.Object({
				repos: t.Array(t.String({ minLength: 3 })),
				rough_jd: t.String({ minLength: 3 }),
			}),
		}
	)
	.post(
		"/analyze-repos",
		async ({ body }) => {
			const normalized = body.repo_urls.map((url) => url.trim()).filter(Boolean);
			return {
				success: true,
				data: {
					repo_urls: normalized,
					note: "Use /api/recruiter/generate-jd for full agentic analysis",
				},
			};
		},
		{
			body: t.Object({
				repo_urls: t.Array(t.String({ minLength: 3 })),
			}),
		}
	);
