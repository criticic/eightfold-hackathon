import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { auth } from "./auth/index.js";
import { recruiterRoutes } from "./routes/recruiter.js";
import { candidateRoutes } from "./routes/candidate.js";

const app = new Elysia()
	.use(
		cors({
			origin: ["http://localhost:3000", "http://localhost:3001"],
			credentials: true,
			methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
			allowedHeaders: ["Content-Type", "Authorization"],
		})
	)
	.all("/api/auth/*", ({ request, set }) => {
		if (request.method !== "GET" && request.method !== "POST") {
			set.status = 405;
			return { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Use GET/POST for auth endpoints" } };
		}

		return auth.handler(request);
	})
	.get("/health", () => ({ success: true, status: "ok", service: "backend" }))
	.use(recruiterRoutes)
	.use(candidateRoutes)
	.onError(({ code, error, set }) => {
		if (code === "VALIDATION") {
			set.status = 400;
			return {
				success: false,
				error: {
					code: "VALIDATION_ERROR",
					message: error.message,
				},
			};
		}

		set.status = 500;
		return {
			success: false,
			error: {
				code: "INTERNAL_ERROR",
				message: error.message,
			},
		};
	});

const port = Number(process.env.PORT || 8000);

app.listen(port);
console.log(`Backend running at http://localhost:${port}`);
