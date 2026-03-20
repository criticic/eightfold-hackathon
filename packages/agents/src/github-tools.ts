/**
 * GitHub exploration tools for the agent
 */

import { Octokit } from "octokit";
import type { Tool, GitHubFileInfo } from "./types.js";

export class GitHubTools {
	private octokit: Octokit;
	private cache: Map<string, unknown> = new Map();

	constructor() {
		const token = process.env.GITHUB_TOKEN;

		if (token) {
			this.octokit = new Octokit({ auth: token });
			console.log("✅ Using GitHub token authentication");
		} else {
			console.warn("⚠️  No GITHUB_TOKEN found, using unauthenticated access (60 req/hour limit)");
			this.octokit = new Octokit();
		}
	}

	/**
	 * List files and directories in a repository path
	 */
	createListFilesTool(): Tool {
		return {
			name: "list_repo_files",
			description:
				"List files and directories in a GitHub repository at a specific path. Use this to explore the repository structure and find relevant files to read.",
			parameters: {
				type: "object",
				properties: {
					owner: {
						type: "string",
						description: "Repository owner (username or organization)",
					},
					repo: {
						type: "string",
						description: "Repository name",
					},
					path: {
						type: "string",
						description: "Path within the repository (use empty string for root)",
					},
				},
				required: ["owner", "repo", "path"],
			},
			execute: async (args: Record<string, unknown>) => {
				const { owner, repo, path } = args as { owner: string; repo: string; path: string };
				const cacheKey = `list:${owner}/${repo}:${path}`;

				if (this.cache.has(cacheKey)) {
					return this.cache.get(cacheKey) as string;
				}

				try {
					const { data } = await this.octokit.rest.repos.getContent({
						owner,
						repo,
						path: path || "",
					});

					if (!Array.isArray(data)) {
						return `Error: ${path} is a file, not a directory. Use read_repo_file to read it.`;
					}

					const files: GitHubFileInfo[] = data.map((item) => ({
						path: item.path,
						type: item.type === "dir" ? "dir" : "file",
						size: item.size,
						sha: item.sha,
					}));

					const result = JSON.stringify(
						{
							path: path || "/",
							total_items: files.length,
							directories: files.filter((f) => f.type === "dir").map((f) => f.path),
							files: files
								.filter((f) => f.type === "file")
								.map((f) => ({ path: f.path, size: f.size })),
						},
						null,
						2,
					);

					this.cache.set(cacheKey, result);
					return result;
				} catch (error) {
					return `Error listing files: ${error instanceof Error ? error.message : String(error)}`;
				}
			},
		};
	}

	/**
	 * Read a file from a GitHub repository
	 */
	createReadFileTool(): Tool {
		return {
			name: "read_repo_file",
			description:
				"Read the contents of a file from a GitHub repository. Use this to examine configuration files, source code, documentation, etc.",
			parameters: {
				type: "object",
				properties: {
					owner: {
						type: "string",
						description: "Repository owner",
					},
					repo: {
						type: "string",
						description: "Repository name",
					},
					path: {
						type: "string",
						description: "Path to the file within the repository",
					},
				},
				required: ["owner", "repo", "path"],
			},
			execute: async (args: Record<string, unknown>) => {
				const { owner, repo, path } = args as { owner: string; repo: string; path: string };
				const cacheKey = `read:${owner}/${repo}:${path}`;

				if (this.cache.has(cacheKey)) {
					return this.cache.get(cacheKey) as string;
				}

				try {
					const { data } = await this.octokit.rest.repos.getContent({
						owner,
						repo,
						path,
					});

					if (Array.isArray(data)) {
						return `Error: ${path} is a directory, not a file. Use list_repo_files to list its contents.`;
					}

					if (data.type !== "file") {
						return `Error: ${path} is not a file.`;
					}

					// Decode base64 content
					const content = Buffer.from(data.content, "base64").toString("utf-8");

					// Truncate very large files
					const maxLength = 50000; // ~50KB
					const truncated = content.length > maxLength;
					const result = truncated ? content.slice(0, maxLength) + "\n\n[... truncated ...]" : content;

					const fullResult = `File: ${owner}/${repo}/${path}\nSize: ${data.size} bytes${truncated ? " (truncated)" : ""}\n\n${result}`;

					this.cache.set(cacheKey, fullResult);
					return fullResult;
				} catch (error) {
					return `Error reading file: ${error instanceof Error ? error.message : String(error)}`;
				}
			},
		};
	}

	/**
	 * Get repository metadata and statistics
	 */
	createGetRepoInfoTool(): Tool {
		return {
			name: "get_repo_info",
			description:
				"Get high-level information about a repository including description, languages, topics, and statistics. Use this first to understand what the repository is about.",
			parameters: {
				type: "object",
				properties: {
					owner: {
						type: "string",
						description: "Repository owner",
					},
					repo: {
						type: "string",
						description: "Repository name",
					},
				},
				required: ["owner", "repo"],
			},
			execute: async (args: Record<string, unknown>) => {
				const { owner, repo } = args as { owner: string; repo: string };
				const cacheKey = `info:${owner}/${repo}`;

				if (this.cache.has(cacheKey)) {
					return this.cache.get(cacheKey) as string;
				}

				try {
					const [repoData, languagesData] = await Promise.all([
						this.octokit.rest.repos.get({ owner, repo }),
						this.octokit.rest.repos.listLanguages({ owner, repo }),
					]);

					const result = JSON.stringify(
						{
							name: repoData.data.full_name,
							description: repoData.data.description,
							languages: languagesData.data,
							topics: repoData.data.topics || [],
							default_branch: repoData.data.default_branch,
							size: repoData.data.size,
							stars: repoData.data.stargazers_count,
							created_at: repoData.data.created_at,
							updated_at: repoData.data.updated_at,
						},
						null,
						2,
					);

					this.cache.set(cacheKey, result);
					return result;
				} catch (error) {
					return `Error getting repo info: ${error instanceof Error ? error.message : String(error)}`;
				}
			},
		};
	}

	/**
	 * Search for files in a repository by name pattern
	 */
	createSearchFilesTool(): Tool {
		return {
			name: "search_repo_files",
			description:
				"Search for files in a repository by name pattern (e.g., 'package.json', '*.config.js'). Useful for finding configuration files or specific types of files.",
			parameters: {
				type: "object",
				properties: {
					owner: {
						type: "string",
						description: "Repository owner",
					},
					repo: {
						type: "string",
						description: "Repository name",
					},
					query: {
						type: "string",
						description: "Search query (filename or pattern)",
					},
				},
				required: ["owner", "repo", "query"],
			},
			execute: async (args: Record<string, unknown>) => {
				const { owner, repo, query } = args as { owner: string; repo: string; query: string };

				try {
					const { data } = await this.octokit.rest.search.code({
						q: `${query} repo:${owner}/${repo}`,
						per_page: 20,
					});

					const files = data.items.map((item) => ({
						path: item.path,
						url: item.html_url,
					}));

					return JSON.stringify(
						{
							query,
							total_count: data.total_count,
							files: files,
						},
						null,
						2,
					);
				} catch (error) {
					return `Error searching files: ${error instanceof Error ? error.message : String(error)}`;
				}
			},
		};
	}

	/**
	 * Create a "think" tool that allows the agent to reason out loud
	 */
	createThinkTool(): Tool {
		return {
			name: "think",
			description:
				"Use this to think out loud about what you've discovered and plan your next steps. This helps organize your analysis and decide which files to explore next.",
			parameters: {
				type: "object",
				properties: {
					thoughts: {
						type: "string",
						description: "Your current thoughts, observations, and plans",
					},
				},
				required: ["thoughts"],
			},
			execute: async (args: Record<string, unknown>) => {
				const { thoughts } = args as { thoughts: string };
				return `Noted: ${thoughts}`;
			},
		};
	}

	/**
	 * Get all tools
	 */
	getAllTools(): Tool[] {
		return [
			this.createGetRepoInfoTool(),
			this.createListFilesTool(),
			this.createReadFileTool(),
			this.createSearchFilesTool(),
			this.createThinkTool(),
		];
	}

	/**
	 * Clear the cache
	 */
	clearCache(): void {
		this.cache.clear();
	}
}
