/**
 * Job Description Generation Workflow
 */

import { AgentLoop } from "./agent-loop.js";
import { GitHubTools } from "./github-tools.js";
import type { JDGenerationInput, JobDescription } from "./types.js";
import { requireGeminiApiKey } from "./env.js";

const JD_GENERATION_SYSTEM_PROMPT = `You are an expert technical recruiter and software engineer analyzing GitHub repositories to create accurate, evidence-based job descriptions.

Your task is to:
1. Explore the provided company repositories to understand their tech stack, architecture, and patterns
2. Identify the specific technologies, frameworks, and tools they use
3. Generate a realistic job description based on actual code evidence
4. Provide both a detailed version (with company specifics) and an anonymized version (generic)

IMPORTANT GUIDELINES:
- You should explore ~10-15 key files per repository (don't try to read everything)
- Start with configuration files (package.json, requirements.txt, go.mod, etc.)
- Then look at entry points (main.ts, index.js, app.py, etc.)
- Finally, explore 2-3 core modules to understand architecture
- Always cite specific files as evidence for your findings
- Use the "think" tool to reason about what you've found and plan next steps
- Be thorough but efficient - focus on the most relevant files

WORKFLOW:
1. For each repository:
   - Get repo info to understand the project
   - List files in the root to see structure
   - Read key configuration files
   - Explore main source directories
   - Read 2-3 important source files
2. Synthesize findings across all repos
3. Generate a comprehensive job description with evidence
4. Create both detailed and anonymized versions

Remember: Every technical requirement must be backed by evidence from actual files you've read!`;

export class JDGenerator {
	constructor() {}

	/**
	 * Generate a job description from GitHub repositories
	 */
	async generateJD(
		input: JDGenerationInput,
		options?: {
			onProgress?: (event: { phase: string; message: string; payload?: Record<string, unknown> }) => void;
		}
	): Promise<JobDescription> {
		const apiKey = requireGeminiApiKey();
		options?.onProgress?.({
			phase: "init",
			message: `Starting JD generation for ${input.repos.length} repositories`,
			payload: { repos: input.repos },
		});
		console.log("\n" + "=".repeat(80));
		console.log("🎯 TruthTalent JD Generator");
		console.log("=".repeat(80));
		console.log(`\n📦 Analyzing ${input.repos.length} repositories:`);
		input.repos.forEach((repo) => console.log(`   - ${repo}`));
		console.log(`\n📋 Context: ${input.rough_jd}`);
		console.log("\n" + "=".repeat(80));

		// Create tools
		const githubTools = new GitHubTools();
		const tools = githubTools.getAllTools();

		// Create detailed prompt
		const prompt = this.createJDGenerationPrompt(input);

		// Run agent loop
		const agentLoop = new AgentLoop({
			systemPrompt: JD_GENERATION_SYSTEM_PROMPT,
			tools,
			apiKey,
				onEvent: (event) => {
					if (event.type === "tool_called") {
						options?.onProgress?.({
							phase: "tool_call",
							message: `Agent invoked ${event.name}`,
							payload: { iteration: event.iteration, args: event.argsPreview },
						});
					} else if (event.type === "model_thought") {
						options?.onProgress?.({
							phase: "thought",
							message: `Thought summary: ${event.textPreview}`,
							payload: { iteration: event.iteration },
						});
					} else if (event.type === "tool_result") {
						if (event.name === "think" && event.resultPreview) {
							options?.onProgress?.({
								phase: "thought",
								message: `Thought summary: ${event.resultPreview.replace(/^Noted:\s*/, "")}`,
								payload: { iteration: event.iteration },
							});
						} else {
							options?.onProgress?.({
								phase: "tool_result",
								message: `${event.name} returned ${event.resultLength} chars`,
								payload: { iteration: event.iteration },
							});
						}
					} else if (event.type === "iteration_started") {
					options?.onProgress?.({
						phase: "iteration",
						message: `Iteration ${event.iteration}${event.maxIterations ? `/${event.maxIterations}` : ""}`,
					});
				} else if (event.type === "run_completed") {
					options?.onProgress?.({
						phase: "finalize",
						message: `Agent completed in ${event.iterations} iterations`,
					});
				} else if (event.type === "iteration_failed") {
					options?.onProgress?.({
						phase: "error",
						message: event.error,
					});
				}
			},
		});

		const state = await agentLoop.run(prompt);

		// Extract final response
		const finalResponse = agentLoop.getFinalResponse(state);

		// Parse the job description from the response
		const jd = this.parseJobDescription(finalResponse, input);
		options?.onProgress?.({
			phase: "parsed",
			message: "Parsed generated JD response into structured format",
		});

		console.log("\n" + "=".repeat(80));
		console.log("✅ Job Description Generated!");
		console.log("=".repeat(80));

		return jd;
	}

	/**
	 * Create the initial prompt for JD generation
	 */
	private createJDGenerationPrompt(input: JDGenerationInput): string {
		return `I need you to analyze these GitHub repositories and generate a job description:

REPOSITORIES:
${input.repos.map((repo) => `- ${repo}`).join("\n")}

CONTEXT: ${input.rough_jd}

Please explore these repositories systematically:

1. **For each repository:**
   - Start with get_repo_info to understand what it is
   - List files in the root directory
   - Read key configuration files (package.json, requirements.txt, go.mod, Cargo.toml, etc.)
   - Explore the main source directory (src/, app/, lib/, etc.)
   - Read 2-3 important source files to understand architecture and patterns

2. **As you explore, use the "think" tool** to:
   - Summarize what you've learned so far
   - Identify patterns and key technologies
   - Decide which files to explore next
   - Connect findings across repositories

3. **After exploring all repos, generate a job description** in this exact JSON format:

\`\`\`json
{
  "title": "Software Engineer - [Specific Area]",
  "company": "[Inferred or Generic Company Name]",
  "team": "[Team based on context]",
  "overview": "Brief overview of the role and team",
  "responsibilities": [
    "Specific responsibility based on codebase",
    "Another specific responsibility"
  ],
  "required_skills": {
    "technical": ["Specific technical skills found in repos"],
    "tools": ["Specific tools like Docker, Kubernetes, etc."],
    "frameworks": ["React, Django, etc."],
    "languages": ["TypeScript", "Python", "Go", etc.]
  },
  "preferred_skills": {
    "technical": ["Additional skills that would be helpful"],
    "tools": ["Additional tools"],
    "frameworks": ["Additional frameworks"]
  },
  "experience_level": "Senior/Mid-level/etc.",
  "detailed_version": "Full multi-paragraph JD with company-specific details and technologies. Mention specific repos, patterns found, architecture decisions, etc. This is the version we'll use internally for matching.",
  "anonymized_version": "Generic version suitable for public posting. Remove company-specific details, repo names, and proprietary patterns. Keep technical requirements but make them more general.",
  "evidence": {
    "repos_analyzed": ["owner/repo1", "owner/repo2"],
    "key_files": ["owner/repo/path/to/file1.ts", "owner/repo/path/to/file2.py"],
    "technologies_found": {
      "React": ["owner/repo/src/App.tsx", "owner/repo/package.json"],
      "PostgreSQL": ["owner/repo/src/db/connection.ts"],
      "Docker": ["owner/repo/Dockerfile", "owner/repo/docker-compose.yml"]
    }
  }
}
\`\`\`

**IMPORTANT:**
- Be thorough but efficient - aim for 10-15 files total across all repos
- Every technical requirement must reference specific files you've read
- The detailed_version should be comprehensive and mention specific patterns/files
- The anonymized_version should be generic enough to post publicly
- Include complete file paths in the evidence section

Start by exploring the first repository!`;
	}

	/**
	 * Parse job description from agent response
	 */
	private parseJobDescription(response: string, input: JDGenerationInput): JobDescription {
		// Try to extract JSON from the response
		const jsonMatch = response.match(/```json\n([\s\S]+?)\n```/);

		if (jsonMatch) {
			try {
				const parsed = JSON.parse(jsonMatch[1]);
				return parsed as JobDescription;
			} catch (error) {
				console.error("Failed to parse JSON from response:", error);
			}
		}

		// Fallback: create a basic JD structure
		console.warn("⚠️  Could not extract structured JD, creating fallback...");

		return {
			title: "Software Engineer",
			company: "Tech Company",
			team: input.rough_jd || "Engineering Team",
			overview: response.slice(0, 500),
			responsibilities: ["Work on the engineering team", "Write and review code"],
			required_skills: {
				technical: [],
				tools: [],
				frameworks: [],
				languages: [],
			},
			preferred_skills: {
				technical: [],
				tools: [],
				frameworks: [],
			},
			experience_level: "Mid-level",
			detailed_version: response,
			anonymized_version: response,
			evidence: {
				repos_analyzed: input.repos,
				key_files: [],
				technologies_found: {},
			},
		};
	}

	/**
	 * Anonymize a detailed job description
	 */
	async anonymizeJD(detailedJD: JobDescription): Promise<string> {
		const apiKey = requireGeminiApiKey();
		console.log("\n🔒 Anonymizing job description...");

		// The agent already generates both versions
		// But we can provide an additional anonymization step if needed

		const githubTools = new GitHubTools();
		const tools = [githubTools.createThinkTool()]; // Just thinking, no GitHub access

		const prompt = `Given this detailed job description, create a fully anonymized version suitable for public posting:

DETAILED VERSION:
${detailedJD.detailed_version}

Please create an anonymized version that:
1. Removes company-specific repository names, patterns, and architecture details
2. Keeps the technical requirements but makes them more general
3. Removes any mention of specific internal tools or proprietary systems
4. Maintains the core responsibilities and skill requirements
5. Is professional and suitable for a public job posting

Return ONLY the anonymized job description text (no JSON, no formatting).`;

		const agentLoop = new AgentLoop({
			systemPrompt: "You are an expert recruiter who specializes in creating public job descriptions that protect company confidentiality while being attractive to candidates.",
			tools,
			maxIterations: 3,
			apiKey,
		});

		const state = await agentLoop.run(prompt);
		return agentLoop.getFinalResponse(state);
	}
}
