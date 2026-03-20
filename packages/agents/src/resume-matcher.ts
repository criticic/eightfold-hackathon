/**
 * Resume extraction + GitHub evidence matching workflow
 */

import { GoogleGenAI } from "@google/genai";
import { AgentLoop } from "./agent-loop.js";
import { GitHubTools } from "./github-tools.js";
import type { ResumeGithubProfile, ResumeMatchInput, ResumeMatchReport, ResumeProfile } from "./types.js";
import { requireGeminiApiKey } from "./env.js";

const RESUME_EXTRACTION_PROMPT = `Extract this resume into strict JSON.

Return ONLY JSON in this format:
{
  "candidate_name": "string",
  "summary": "string",
  "claimed_skills": {
    "languages": ["..."],
    "frameworks": ["..."],
    "tools": ["..."],
    "domains": ["..."]
  },
  "experience_highlights": ["..."],
  "projects": ["..."]
}

Rules:
- Use empty arrays when missing
- Keep claims faithful to the document
- Do not invent details`;

const RESUME_MATCH_SYSTEM_PROMPT = `You are a technical hiring analyst.

Goal: verify resume claims against GitHub evidence from repositories.

Workflow:
1) Read repository metadata and structure.
2) Read high-signal files (package manifests, entry points, core modules).
3) Verify which claimed skills are supported by real evidence.
4) Produce a strict JSON report.

Rules:
- Cite only files you actually read.
- If evidence is weak, mark confidence as low.
- Do not hallucinate frameworks/tools.
- Prefer precision over optimism.`;

const RESUME_GITHUB_EXTRACTION_PROMPT = `Extract GitHub identity and project repositories from this resume.

Return ONLY JSON in this shape:
{
  "github_username": "string",
  "repositories": ["owner/repo"],
  "github_urls": ["https://github.com/owner/repo"]
}

Rules:
- repositories must be strict owner/repo values only
- include repos only when confidence is medium or high
- if username is missing, return empty string
- use empty arrays when missing
- do not include non-GitHub links`;

export class ResumeMatcher {
	private client: GoogleGenAI;
	private apiKey: string;

	constructor() {
		this.apiKey = requireGeminiApiKey();
		this.client = new GoogleGenAI({ apiKey: this.apiKey });
	}

	async generateReport(
		input: ResumeMatchInput,
		options?: {
			onProgress?: (event: { phase: string; message: string; payload?: Record<string, unknown> }) => void;
		}
	): Promise<ResumeMatchReport> {
		options?.onProgress?.({
			phase: "resume_parse",
			message: "Parsing resume into structured profile",
		});
		const resumeProfile = await this.extractResumeProfile(input.resumePath);
		options?.onProgress?.({
			phase: "resume_parse_done",
			message: "Resume profile parsed",
		});

		const githubTools = new GitHubTools();
		const tools = githubTools.getAllTools();

		const prompt = this.buildMatchPrompt(resumeProfile, input);
		const agentLoop = new AgentLoop({
			systemPrompt: RESUME_MATCH_SYSTEM_PROMPT,
			tools,
			maxIterations: 25,
			apiKey: this.apiKey,
			onEvent: (event) => {
				if (event.type === "tool_called") {
					options?.onProgress?.({
						phase: "tool_call",
						message: `Agent invoked ${event.name}`,
						payload: { iteration: event.iteration, args: event.argsPreview },
					});
				} else if (event.type === "tool_result") {
					options?.onProgress?.({
						phase: "tool_result",
						message: `${event.name} returned ${event.resultLength} chars`,
						payload: { iteration: event.iteration },
					});
				} else if (event.type === "model_thought") {
					options?.onProgress?.({
						phase: "thought",
						message: `Thought summary: ${event.textPreview}`,
						payload: { iteration: event.iteration },
					});
				} else if (event.type === "iteration_started") {
					options?.onProgress?.({
						phase: "iteration",
						message: `Iteration ${event.iteration}${event.maxIterations ? `/${event.maxIterations}` : ""}`,
					});
				} else if (event.type === "iteration_failed") {
					options?.onProgress?.({
						phase: "error",
						message: event.error,
					});
				} else if (event.type === "run_completed") {
					options?.onProgress?.({
						phase: "done",
						message: `Agent completed in ${event.iterations} iterations`,
					});
				}
			},
		});

		const state = await agentLoop.run(prompt);
		const finalResponse = agentLoop.getFinalResponse(state);

		return this.parseMatchReport(finalResponse, resumeProfile, input);
	}

	async extractGithubProfile(resumePath: string): Promise<ResumeGithubProfile> {
		const contents = await this.buildResumeContents(resumePath, RESUME_GITHUB_EXTRACTION_PROMPT);
		const response = await (this.client.models as any).generateContent({
			model: "gemini-3-flash-preview",
			contents,
		});

		const text = this.extractText(response);
		const parsed = this.parseJsonFromText(text);
		const repositories = this.toStringArray(parsed.repositories)
			.map((item) => this.normalizeRepo(item))
			.filter(Boolean);

		const githubUrls = this.toStringArray(parsed.github_urls).filter((url) => url.includes("github.com"));
		const githubUsername = this.normalizeGithubUsername(parsed.github_username);

		return {
			github_username: githubUsername,
			repositories: Array.from(new Set(repositories)),
			github_urls: Array.from(new Set(githubUrls)),
		};
	}

	private async extractResumeProfile(resumePath: string): Promise<ResumeProfile> {
		const contents = await this.buildResumeContents(resumePath, RESUME_EXTRACTION_PROMPT);
		const response = await (this.client.models as any).generateContent({
			model: "gemini-3-flash-preview",
			contents,
		});

		const text = this.extractText(response);
		const parsed = this.parseJsonFromText(text);

		return {
			candidate_name: typeof parsed.candidate_name === "string" ? parsed.candidate_name : "Unknown Candidate",
			summary: typeof parsed.summary === "string" ? parsed.summary : "",
			claimed_skills: {
				languages: this.toStringArray(parsed?.claimed_skills?.languages),
				frameworks: this.toStringArray(parsed?.claimed_skills?.frameworks),
				tools: this.toStringArray(parsed?.claimed_skills?.tools),
				domains: this.toStringArray(parsed?.claimed_skills?.domains),
			},
			experience_highlights: this.toStringArray(parsed.experience_highlights),
			projects: this.toStringArray(parsed.projects),
		};
	}

	private async buildResumeContents(resumePath: string, prompt: string): Promise<unknown[]> {
		const resumeFile = Bun.file(resumePath);
		if (!(await resumeFile.exists())) {
			throw new Error(`Resume file not found: ${resumePath}`);
		}

		const mimeType = this.getMimeType(resumePath);
		let contents: unknown[];

		if (mimeType === "application/pdf") {
			const bytes = new Uint8Array(await resumeFile.arrayBuffer());
			const base64Data = Buffer.from(bytes).toString("base64");
			return [
				{ text: prompt },
				{
					inlineData: {
						mimeType: "application/pdf",
						data: base64Data,
					},
				},
			];
		}

		const rawText = await resumeFile.text();
		return [{ text: `${prompt}\n\nResume Content:\n${rawText}` }];
	}

	private buildMatchPrompt(resume: ResumeProfile, input: ResumeMatchInput): string {
		const role = input.targetRole || "Software Engineer";

		return `Analyze the repositories and produce a verification report for this candidate.

Candidate (from resume extraction):
${JSON.stringify(resume, null, 2)}

Repositories to analyze:
${input.repos.map((repo) => `- ${repo}`).join("\n")}

Target role:
${role}

GitHub username (optional):
${input.githubUsername || "not provided"}

Return ONLY JSON in this format:
{
  "candidate_name": "string",
  "target_role": "string",
  "overall_match_score": 0,
  "verified_skills": [
    {
      "skill": "string",
      "evidence_files": ["owner/repo/path"],
      "confidence": "high|medium|low",
      "notes": "short explanation"
    }
  ],
  "partially_verified_skills": [
    {
      "skill": "string",
      "evidence_files": ["owner/repo/path"],
      "confidence": "high|medium|low",
      "notes": "short explanation"
    }
  ],
  "unverified_claims": ["string"],
  "missing_for_role": ["string"],
  "github_strengths": ["string"],
  "recommendation": "strong_yes|yes|maybe|no",
  "explanation": "1-2 paragraphs"
}

Be evidence-based and conservative with confidence.`;
	}

	private parseMatchReport(response: string, resume: ResumeProfile, input: ResumeMatchInput): ResumeMatchReport {
		const role = input.targetRole || "Software Engineer";

		try {
			const parsed = this.parseJsonFromText(response);
			return {
				candidate_name: typeof parsed.candidate_name === "string" ? parsed.candidate_name : resume.candidate_name,
				target_role: typeof parsed.target_role === "string" ? parsed.target_role : role,
				overall_match_score:
					typeof parsed.overall_match_score === "number" ? Math.max(0, Math.min(100, parsed.overall_match_score)) : 0,
				verified_skills: this.toVerifiedSkills(parsed.verified_skills),
				partially_verified_skills: this.toVerifiedSkills(parsed.partially_verified_skills),
				unverified_claims: this.toStringArray(parsed.unverified_claims),
				missing_for_role: this.toStringArray(parsed.missing_for_role),
				github_strengths: this.toStringArray(parsed.github_strengths),
				recommendation: this.toRecommendation(parsed.recommendation),
				explanation: typeof parsed.explanation === "string" ? parsed.explanation : response,
			};
		} catch {
			return {
				candidate_name: resume.candidate_name,
				target_role: role,
				overall_match_score: 0,
				verified_skills: [],
				partially_verified_skills: [],
				unverified_claims: [],
				missing_for_role: [],
				github_strengths: [],
				recommendation: "maybe",
				explanation: response,
			};
		}
	}

	private extractText(response: any): string {
		if (response?.text && typeof response.text === "string") {
			return response.text;
		}

		const parts = response?.candidates?.[0]?.content?.parts;
		if (Array.isArray(parts)) {
			return parts
				.map((part: any) => (typeof part.text === "string" ? part.text : ""))
				.filter(Boolean)
				.join("\n");
		}

		return "";
	}

	private parseJsonFromText(text: string): Record<string, any> {
		const fenced = text.match(/```json\n([\s\S]+?)\n```/);
		if (fenced?.[1]) {
			return JSON.parse(fenced[1]);
		}

		const firstBrace = text.indexOf("{");
		const lastBrace = text.lastIndexOf("}");
		if (firstBrace >= 0 && lastBrace > firstBrace) {
			return JSON.parse(text.slice(firstBrace, lastBrace + 1));
		}

		return JSON.parse(text);
	}

	private toStringArray(value: unknown): string[] {
		if (!Array.isArray(value)) {
			return [];
		}
		return value.filter((item): item is string => typeof item === "string");
	}

	private toVerifiedSkills(value: unknown): ResumeMatchReport["verified_skills"] {
		if (!Array.isArray(value)) {
			return [];
		}

		return value.map((item) => {
			const record = (item || {}) as Record<string, unknown>;
			const rawConfidence = typeof record.confidence === "string" ? record.confidence : "low";
			const confidence = rawConfidence === "high" || rawConfidence === "medium" || rawConfidence === "low" ? rawConfidence : "low";

			return {
				skill: typeof record.skill === "string" ? record.skill : "",
				evidence_files: this.toStringArray(record.evidence_files),
				confidence,
				notes: typeof record.notes === "string" ? record.notes : "",
			};
		});
	}

	private toRecommendation(value: unknown): ResumeMatchReport["recommendation"] {
		if (value === "strong_yes" || value === "yes" || value === "maybe" || value === "no") {
			return value;
		}
		return "maybe";
	}

	private getMimeType(filePath: string): string {
		const lowerPath = filePath.toLowerCase();
		if (lowerPath.endsWith(".pdf")) return "application/pdf";
		if (lowerPath.endsWith(".md")) return "text/markdown";
		if (lowerPath.endsWith(".txt")) return "text/plain";
		if (lowerPath.endsWith(".html") || lowerPath.endsWith(".htm")) return "text/html";
		return "text/plain";
	}

	private normalizeRepo(value: string): string {
		const trimmed = value.trim();
		if (!trimmed) return "";
		const withoutPrefix = trimmed.replace(/^https?:\/\/github\.com\//i, "").replace(/\.git$/i, "").replace(/[?#].*$/, "").replace(/\/$/, "");
		const parts = withoutPrefix.split("/").filter(Boolean);
		if (parts.length < 2) return "";
		return `${parts[0]}/${parts[1]}`;
	}

	private normalizeGithubUsername(value: unknown): string {
		if (typeof value !== "string") return "";
		const trimmed = value.trim();
		if (!trimmed) return "";
		const withoutPrefix = trimmed.replace(/^https?:\/\/github\.com\//i, "").replace(/[?#].*$/, "").replace(/\/$/, "");
		const first = withoutPrefix.split("/").filter(Boolean)[0];
		return first || "";
	}
}
