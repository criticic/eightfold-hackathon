import { Elysia, t } from "elysia";
import { createHash } from "node:crypto";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { eq } from "drizzle-orm";

const hashPassword = (password: string): string => createHash("sha256").update(password).digest("hex");

export const authRoutes = new Elysia({ prefix: "/api/auth" })
	.post(
		"/signup",
		async ({ body, status }) => {
			const existing = await db.select().from(users).where(eq(users.username, body.username)).limit(1);
			if (existing.length > 0) {
				return status(409, {
					success: false,
					error: {
						code: "USERNAME_TAKEN",
						message: "Username is already registered",
					},
				});
			}

			const now = Date.now();
			const inserted = await db
				.insert(users)
				.values({
					username: body.username,
					password_hash: hashPassword(body.password),
					role: body.role,
					created_at: now,
				})
				.returning({ id: users.id, username: users.username, role: users.role, created_at: users.created_at });

			return {
				success: true,
				data: inserted[0],
			};
		},
		{
			body: t.Object({
				username: t.String({ minLength: 3, maxLength: 32 }),
				password: t.String({ minLength: 8, maxLength: 128 }),
				role: t.Union([t.Literal("recruiter"), t.Literal("candidate")]),
			}),
		}
	)
	.post(
		"/login",
		async ({ body, status }) => {
			const existing = await db.select().from(users).where(eq(users.username, body.username)).limit(1);
			if (existing.length === 0) {
				return status(401, {
					success: false,
					error: {
						code: "INVALID_CREDENTIALS",
						message: "Invalid username or password",
					},
				});
			}

			const user = existing[0];
			if (user.password_hash !== hashPassword(body.password)) {
				return status(401, {
					success: false,
					error: {
						code: "INVALID_CREDENTIALS",
						message: "Invalid username or password",
					},
				});
			}

			if (body.role && user.role !== body.role) {
				return status(401, {
					success: false,
					error: {
						code: "ROLE_MISMATCH",
						message: `Account belongs to ${user.role}. Use ${user.role} login.`,
					},
				});
			}

			return {
				success: true,
				data: {
					id: user.id,
					username: user.username,
					role: user.role,
					created_at: user.created_at,
				},
			};
		},
		{
			body: t.Object({
				username: t.String({ minLength: 3, maxLength: 32 }),
				password: t.String({ minLength: 8, maxLength: 128 }),
				role: t.Optional(t.Union([t.Literal("recruiter"), t.Literal("candidate")])),
			}),
		}
	);
