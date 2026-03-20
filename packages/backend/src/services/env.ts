export function hasGeminiApiKey(): boolean {
	return Boolean(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY);
}
