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
	maxIterations: number;
	isComplete: boolean;
	metadata: Record<string, unknown>;
}

export interface AgentConfig {
	systemPrompt: string;
	tools: Tool[];
	maxIterations: number;
	apiKey: string;
}

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
