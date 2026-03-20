import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const parseEnv = (content: string): Record<string, string> => {
	const out: Record<string, string> = {};
	for (const rawLine of content.split(/\r?\n/)) {
		const line = rawLine.trim();
		if (!line || line.startsWith("#")) continue;
		const idx = line.indexOf("=");
		if (idx <= 0) continue;
		const key = line.slice(0, idx).trim();
		let value = line.slice(idx + 1).trim();
		if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
			value = value.slice(1, -1);
		}
		out[key] = value;
	}
	return out;
};

export const loadBackendEnv = () => {
	const candidates = [
		resolve(process.cwd(), ".env"),
		resolve(process.cwd(), "packages/backend/.env"),
		resolve(process.cwd(), "../.env"),
		resolve(import.meta.dir, "../../.env"),
		resolve(import.meta.dir, "../../../.env"),
	];

	for (const filePath of candidates) {
		if (!existsSync(filePath)) continue;
		const parsed = parseEnv(readFileSync(filePath, "utf8"));
		for (const [key, value] of Object.entries(parsed)) {
			if (!process.env[key]) {
				process.env[key] = value;
			}
		}
	}
};
