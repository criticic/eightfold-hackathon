import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { authRoutes } from "./routes/auth.js";
import { recruiterRoutes } from "./routes/recruiter.js";
import { candidateRoutes } from "./routes/candidate.js";
import { hasGeminiApiKey } from "./services/env.js";
import { loadBackendEnv } from "./services/load-env.js";

loadBackendEnv();

const app = new Elysia()
	.use(
		cors({
			origin: ["http://localhost:3000", "http://localhost:3001"],
			credentials: true,
			methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
			allowedHeaders: ["Content-Type", "Authorization"],
		})
	)
	.get("/health", () => ({ success: true, status: "ok", service: "backend" }))
	.get("/health/env", () => ({
		success: true,
		data: {
			has_gemini_key: hasGeminiApiKey(),
		},
	}))
	.use(authRoutes)
	.use(recruiterRoutes)
	.use(candidateRoutes)
	.onError(({ code, error, set }) => {
		const message = error instanceof Error ? error.message : String(error);
		if (code === "VALIDATION") {
			set.status = 400;
			return {
				success: false,
				error: {
					code: "VALIDATION_ERROR",
					message,
				},
			};
		}

		set.status = 500;
		return {
			success: false,
			error: {
				code: "INTERNAL_ERROR",
				message,
			},
		};
	});

const port = Number(process.env.PORT || 8000);

app.listen(port);
console.log(`Backend running at http://localhost:${port}`);
