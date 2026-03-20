export function getGeminiApiKey(): string {
	return process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "";
}

export function requireGeminiApiKey(): string {
	const key = getGeminiApiKey();
	if (!key) {
		throw new Error("Missing Gemini API key. Set GOOGLE_API_KEY or GEMINI_API_KEY.");
	}
	return key;
}
