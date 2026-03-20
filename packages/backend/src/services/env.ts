export function hasGeminiApiKey(): boolean {
	return Boolean(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY);
}

export function hasGithubToken(): boolean {
	return Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim().length > 0);
}
