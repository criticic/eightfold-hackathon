#!/usr/bin/env bun

/**
 * CLI for testing the JD generator
 */

import { JDGenerator } from "./jd-generator.js";
import type { JDGenerationInput } from "./types.js";
import { readFileSync, existsSync } from "fs";

function loadEnv() {
	const envPaths = [
		process.cwd() + "/.env",
		process.cwd() + "/../.env",
		process.cwd() + "/../../.env",
		process.cwd() + "/../../../.env",
	];

	for (const envPath of envPaths) {
		if (existsSync(envPath)) {
			const content = readFileSync(envPath, "utf-8");
			for (const line of content.split("\n")) {
				const trimmed = line.trim();
				if (trimmed && !trimmed.startsWith("#")) {
					const eqIndex = trimmed.indexOf("=");
					if (eqIndex > 0) {
						const key = trimmed.slice(0, eqIndex).trim();
						const value = trimmed.slice(eqIndex + 1).trim();
						if (!process.env[key]) {
							process.env[key] = value;
						}
					}
				}
			}
			break;
		}
	}
}

async function main() {
	// Load .env file
	loadEnv();

	console.log("\n🚀 TruthTalent JD Generator CLI\n");

	// Get arguments
	const args = process.argv.slice(2);

	if (args.length < 2) {
		console.error("Usage: bun run cli.ts <repo1> <repo2> [...] -- <rough_jd>");
		console.error("\nExample:");
		console.error('  bun run cli.ts vercel/next.js vercel/turbo -- "Frontend engineer for build tools team"');
		console.error("\nEnvironment variables:");
		console.error("  GOOGLE_API_KEY - Required for Gemini API");
		console.error("  GITHUB_TOKEN - Optional, for private repos or higher rate limits");
		process.exit(1);
	}

	// Check for API key
	if (!process.env.GOOGLE_API_KEY) {
		console.error("❌ Error: GOOGLE_API_KEY environment variable is required");
		console.error("\nGet your API key from: https://makersuite.google.com/app/apikey");
		console.error('Then run: export GOOGLE_API_KEY="your-key-here"');
		process.exit(1);
	}

	// Check for GitHub App credentials
	if (!process.env.GITHUB_APP_ID || !process.env.GITHUB_PRIVATE_KEY_PATH) {
		console.warn("\n⚠️  Warning: GitHub App credentials not found");
		console.warn("   Set GITHUB_APP_ID and GITHUB_PRIVATE_KEY_PATH for higher rate limits");
		console.warn("   Continuing with unauthenticated access (60 requests/hour)\n");
	}

	// Parse arguments
	const separatorIndex = args.indexOf("--");
	let repos: string[];
	let roughJD: string;

	if (separatorIndex === -1) {
		// No separator, last arg is rough JD
		repos = args.slice(0, -1);
		roughJD = args[args.length - 1];
	} else {
		// Separator found
		repos = args.slice(0, separatorIndex);
		roughJD = args.slice(separatorIndex + 1).join(" ");
	}

	// Validate repos
	if (repos.length === 0) {
		console.error("❌ Error: At least one repository is required");
		process.exit(1);
	}

	for (const repo of repos) {
		if (!repo.includes("/")) {
			console.error(`❌ Error: Invalid repository format: ${repo}`);
			console.error("   Expected format: owner/repo (e.g., vercel/next.js)");
			process.exit(1);
		}
	}

	// Create input
	const input: JDGenerationInput = {
		repos,
		rough_jd: roughJD,
	};

	try {
		// Generate JD
		const generator = new JDGenerator();
		const jd = await generator.generateJD(input);

		// Display results
		console.log("\n" + "=".repeat(80));
		console.log("📄 GENERATED JOB DESCRIPTION");
		console.log("=".repeat(80));

		console.log(`\n📌 Title: ${jd.title}`);
		console.log(`🏢 Company: ${jd.company}`);
		console.log(`👥 Team: ${jd.team}`);
		console.log(`📊 Level: ${jd.experience_level}`);

		console.log(`\n📝 Overview:\n${jd.overview}`);

		console.log(`\n✅ Responsibilities:`);
		jd.responsibilities.forEach((resp, i) => console.log(`   ${i + 1}. ${resp}`));

		console.log(`\n🔧 Required Skills:`);
		if (jd.required_skills.languages.length > 0) {
			console.log(`   Languages: ${jd.required_skills.languages.join(", ")}`);
		}
		if (jd.required_skills.frameworks.length > 0) {
			console.log(`   Frameworks: ${jd.required_skills.frameworks.join(", ")}`);
		}
		if (jd.required_skills.tools.length > 0) {
			console.log(`   Tools: ${jd.required_skills.tools.join(", ")}`);
		}
		if (jd.required_skills.technical.length > 0) {
			console.log(`   Technical: ${jd.required_skills.technical.join(", ")}`);
		}

		console.log(`\n⭐ Preferred Skills:`);
		if (jd.preferred_skills.frameworks.length > 0) {
			console.log(`   Frameworks: ${jd.preferred_skills.frameworks.join(", ")}`);
		}
		if (jd.preferred_skills.tools.length > 0) {
			console.log(`   Tools: ${jd.preferred_skills.tools.join(", ")}`);
		}
		if (jd.preferred_skills.technical.length > 0) {
			console.log(`   Technical: ${jd.preferred_skills.technical.join(", ")}`);
		}

		console.log(`\n📊 Evidence:`);
		console.log(`   Repos analyzed: ${jd.evidence.repos_analyzed.length}`);
		console.log(`   Key files: ${jd.evidence.key_files.length}`);
		console.log(`   Technologies found: ${Object.keys(jd.evidence.technologies_found).length}`);

		if (Object.keys(jd.evidence.technologies_found).length > 0) {
			console.log(`\n🔍 Technology Evidence:`);
			for (const [tech, files] of Object.entries(jd.evidence.technologies_found)) {
				console.log(`   ${tech}:`);
				files.slice(0, 3).forEach((file) => console.log(`     - ${file}`));
				if (files.length > 3) {
					console.log(`     ... and ${files.length - 3} more`);
				}
			}
		}

		console.log(`\n${"=".repeat(80)}`);
		console.log("📋 DETAILED VERSION (Internal Use)");
		console.log("=".repeat(80));
		console.log(jd.detailed_version);

		console.log(`\n${"=".repeat(80)}`);
		console.log("🔒 ANONYMIZED VERSION (Public Posting)");
		console.log("=".repeat(80));
		console.log(jd.anonymized_version);

		// Save to file
		const outputFile = `jd_${Date.now()}.json`;
		await Bun.write(outputFile, JSON.stringify(jd, null, 2));
		console.log(`\n💾 Saved to: ${outputFile}`);

		console.log("\n✅ Done!\n");
	} catch (error) {
		console.error("\n❌ Error generating job description:");
		console.error(error);
		process.exit(1);
	}
}

main();
