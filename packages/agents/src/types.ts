/**
 * Core types for the agentic system
 */

export type MessageRole = "system" | "user" | "assistant" | "tool";

export interface TextContent {
	type: "text";
	text: string;
}

export interface ToolCallContent {
	type: "tool_call";
	id: string;
	name: string;
	arguments: Record<string, unknown>;
}

export interface ToolResultContent {
	type: "tool_result";
	tool_call_id: string;
	content: string;
}

export type MessageContent = TextContent | ToolCallContent | ToolResultContent;

export interface Message {
	role: MessageRole;
	content: MessageContent[];
}

export interface Tool {
	name: string;
	description: string;
	parameters: {
		type: "object";
		properties: Record<string, unknown>;
		required: string[];
	};
	execute: (args: Record<string, unknown>) => Promise<string>;
}

export interface AgentState {
	messages: Message[];
	tools: Tool[];
	systemPrompt: string;
	currentIteration: number;
	maxIterations?: number;
	isComplete: boolean;
	metadata: Record<string, unknown>;
}

export interface AgentConfig {
	systemPrompt: string;
	tools: Tool[];
	maxIterations?: number;
	apiKey: string;
	onEvent?: (event: AgentEvent) => void;
}

export type AgentEvent =
	| { type: "run_started"; promptPreview: string }
	| { type: "iteration_started"; iteration: number; maxIterations?: number }
	| { type: "model_request"; iteration: number }
	| { type: "model_text"; iteration: number; textPreview: string }
	| { type: "model_thought"; iteration: number; textPreview: string }
	| { type: "tool_called"; iteration: number; name: string; argsPreview: string }
	| { type: "tool_result"; iteration: number; name: string; resultLength: number; resultPreview?: string }
	| { type: "iteration_failed"; iteration: number; error: string }
	| { type: "run_completed"; iterations: number; complete: boolean };

// GitHub-specific types
export interface GitHubFileInfo {
	path: string;
	type: "file" | "dir";
	size?: number;
	sha: string;
}

export interface RepoAnalysis {
	owner: string;
	repo: string;
	techStack: {
		languages: Record<string, number>;
		frameworks: string[];
		tools: string[];
	};
	architecture: {
		structure: string;
		patterns: string[];
	};
	filesExplored: string[];
	keyFindings: string[];
}

// Job Description types
export interface JobDescription {
	title: string;
	company: string;
	team: string;
	overview: string;
	responsibilities: string[];
	required_skills: {
		technical: string[];
		tools: string[];
		frameworks: string[];
		languages: string[];
	};
	preferred_skills: {
		technical: string[];
		tools: string[];
		frameworks: string[];
	};
	experience_level: string;
	detailed_version: string; // Full version with company-specific details
	anonymized_version: string; // Generic version for public posting
	evidence: {
		repos_analyzed: string[];
		key_files: string[];
		technologies_found: Record<string, string[]>; // tech -> [file paths]
	};
}

export interface JDGenerationInput {
	repos: string[]; // Array of "owner/repo" strings
	rough_jd: string; // Rough context like "payments team frontend work"
}

// Resume matching types
export interface ResumeProfile {
	candidate_name: string;
	summary: string;
	claimed_skills: {
		languages: string[];
		frameworks: string[];
		tools: string[];
		domains: string[];
	};
	experience_highlights: string[];
	projects: string[];
}

export interface ResumeMatchInput {
	resumePath: string;
	repos: string[];
	targetRole?: string;
	githubUsername?: string;
}

export interface ResumeGithubProfile {
	github_username: string;
	repositories: string[];
	github_urls: string[];
}

export interface VerifiedSkill {
	skill: string;
	evidence_files: string[];
	confidence: "high" | "medium" | "low";
	notes: string;
}

export interface ResumeMatchReport {
	candidate_name: string;
	target_role: string;
	overall_match_score: number; // 0-100
	verified_skills: VerifiedSkill[];
	partially_verified_skills: VerifiedSkill[];
	unverified_claims: string[];
	missing_for_role: string[];
	github_strengths: string[];
	recommendation: "strong_yes" | "yes" | "maybe" | "no";
	explanation: string;
}
