import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";

const dbPath = resolve(process.cwd(), process.env.DATABASE_URL || "./data/db.sqlite");
mkdirSync(dirname(dbPath), { recursive: true });

export const sqlite = new Database(dbPath, { create: true });
export const db = drizzle(sqlite);
