import { and, eq, gt } from "drizzle-orm";
import { db } from "../db/index.js";
import { analysisCache } from "../db/schema.js";

export async function getCached<T>(key: string): Promise<T | null> {
	const now = Date.now();
	const rows = await db
		.select({ data: analysisCache.data })
		.from(analysisCache)
		.where(and(eq(analysisCache.cache_key, key), gt(analysisCache.expires_at, now)))
		.limit(1);

	if (rows.length === 0) {
		return null;
	}

	return JSON.parse(rows[0].data) as T;
}

export async function setCached(key: string, type: string, data: unknown, ttlMs = 60 * 60 * 1000): Promise<void> {
	const now = Date.now();
	await db
		.insert(analysisCache)
		.values({
			cache_key: key,
			cache_type: type,
			data: JSON.stringify(data),
			created_at: now,
			expires_at: now + ttlMs,
		})
		.onConflictDoUpdate({
			target: analysisCache.cache_key,
			set: {
				cache_type: type,
				data: JSON.stringify(data),
				created_at: now,
				expires_at: now + ttlMs,
			},
		});
}
