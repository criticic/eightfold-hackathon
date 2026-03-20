#!/usr/bin/env bun

/**
 * CLI for JD generation and resume-to-GitHub matching
 */

import { JDGenerator } from "./jd-generator.js";
import { ResumeMatcher } from "./resume-matcher.js";
import type { JDGenerationInput, ResumeMatchInput } from "./types.js";
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

	console.log("\n🚀 TruthTalent Agents CLI\n");

	// Get arguments
	const args = process.argv.slice(2);
	const command = args[0];

	if (!command) {
		printUsageAndExit();
	}

	if (command === "match") {
		await runMatchCommand(args.slice(1));
		return;
	}

	if (command === "jd") {
		await runJDCommand(args.slice(1));
		return;
	}

	// Backward compatibility: existing JD usage without subcommand
	await runJDCommand(args);
}

function printUsageAndExit(): never {
	console.error("Usage:");
	console.error('  bun run cli.ts jd <repo1> <repo2> [...] -- "<rough_jd>"');
	console.error('  bun run cli.ts match --resume <path.pdf|txt|md> --repos <owner/repo,owner/repo> [--role "..."] [--username "..."]');
	console.error("\nExamples:");
	console.error('  bun run cli.ts jd vercel/next.js -- "Frontend engineer"');
	console.error('  bun run cli.ts match --resume ./resume.pdf --repos vercel/next.js,vercel/turbo --role "Frontend engineer"');
	console.error("\nEnvironment variables:");
	console.error("  GOOGLE_API_KEY - Required for Gemini API");
	console.error("  GITHUB_TOKEN - Optional, for private repos or higher rate limits");
	process.exit(1);
}

function assertApiKey() {
	if (!process.env.GOOGLE_API_KEY) {
		console.error("❌ Error: GOOGLE_API_KEY environment variable is required");
		console.error("\nGet your API key from: https://makersuite.google.com/app/apikey");
		console.error('Then run: export GOOGLE_API_KEY="your-key-here"');
		process.exit(1);
	}
}

function printGithubTokenWarning() {
	if (!process.env.GITHUB_TOKEN) {
		console.warn("\n⚠️  Warning: GITHUB_TOKEN not found");
		console.warn("   Continuing with unauthenticated access (60 requests/hour)");
		console.warn("   Set GITHUB_TOKEN for higher rate limits\n");
	}
}

async function runJDCommand(args: string[]) {
	console.log("🎯 Mode: JD Generation\n");

	if (args.length < 2) {
		printUsageAndExit();
	}

	assertApiKey();
	printGithubTokenWarning();

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
		const generator = new JDGenerator();
		const jd = await generator.generateJD(input);

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
		if (jd.required_skills.languages.length > 0) console.log(`   Languages: ${jd.required_skills.languages.join(", ")}`);
		if (jd.required_skills.frameworks.length > 0) console.log(`   Frameworks: ${jd.required_skills.frameworks.join(", ")}`);
		if (jd.required_skills.tools.length > 0) console.log(`   Tools: ${jd.required_skills.tools.join(", ")}`);
		if (jd.required_skills.technical.length > 0) console.log(`   Technical: ${jd.required_skills.technical.join(", ")}`);

		console.log(`\n⭐ Preferred Skills:`);
		if (jd.preferred_skills.frameworks.length > 0) console.log(`   Frameworks: ${jd.preferred_skills.frameworks.join(", ")}`);
		if (jd.preferred_skills.tools.length > 0) console.log(`   Tools: ${jd.preferred_skills.tools.join(", ")}`);
		if (jd.preferred_skills.technical.length > 0) console.log(`   Technical: ${jd.preferred_skills.technical.join(", ")}`);

		console.log(`\n📊 Evidence:`);
		console.log(`   Repos analyzed: ${jd.evidence.repos_analyzed.length}`);
		console.log(`   Key files: ${jd.evidence.key_files.length}`);
		console.log(`   Technologies found: ${Object.keys(jd.evidence.technologies_found).length}`);

		if (Object.keys(jd.evidence.technologies_found).length > 0) {
			console.log(`\n🔍 Technology Evidence:`);
			for (const [tech, files] of Object.entries(jd.evidence.technologies_found)) {
				console.log(`   ${tech}:`);
				files.slice(0, 3).forEach((file) => console.log(`     - ${file}`));
				if (files.length > 3) console.log(`     ... and ${files.length - 3} more`);
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

async function runMatchCommand(args: string[]) {
	console.log("🎯 Mode: Resume-GitHub Match\n");
	assertApiKey();
	printGithubTokenWarning();

	const parsed = parseMatchArgs(args);

	if (!parsed.resumePath || parsed.repos.length === 0) {
		console.error("❌ Error: match mode requires --resume and --repos");
		printUsageAndExit();
	}

	try {
		const matcher = new ResumeMatcher();
		const report = await matcher.generateReport(parsed);

		console.log("\n" + "=".repeat(80));
		console.log("🧠 RESUME ↔ GITHUB MATCH REPORT");
		console.log("=".repeat(80));
		console.log(`\n👤 Candidate: ${report.candidate_name}`);
		console.log(`🎯 Role: ${report.target_role}`);
		console.log(`📈 Match Score: ${report.overall_match_score}/100`);
		console.log(`✅ Recommendation: ${report.recommendation}`);

		console.log("\n🔍 Verified Skills:");
		if (report.verified_skills.length === 0) {
			console.log("   - None");
		} else {
			report.verified_skills.forEach((skill) => {
				console.log(`   - ${skill.skill} (${skill.confidence})`);
				skill.evidence_files.slice(0, 3).forEach((f) => console.log(`      • ${f}`));
			});
		}

		if (report.partially_verified_skills.length > 0) {
			console.log("\n🟨 Partially Verified:");
			report.partially_verified_skills.forEach((skill) => {
				console.log(`   - ${skill.skill} (${skill.confidence})`);
				skill.evidence_files.slice(0, 2).forEach((f) => console.log(`      • ${f}`));
			});
		}

		if (report.unverified_claims.length > 0) {
			console.log("\n⚠️  Unverified Claims:");
			report.unverified_claims.forEach((claim) => console.log(`   - ${claim}`));
		}

		if (report.missing_for_role.length > 0) {
			console.log("\n📌 Missing For Target Role:");
			report.missing_for_role.forEach((item) => console.log(`   - ${item}`));
		}

		if (report.github_strengths.length > 0) {
			console.log("\n💪 GitHub Strengths:");
			report.github_strengths.forEach((item) => console.log(`   - ${item}`));
		}

		console.log("\n📝 Explanation:");
		console.log(report.explanation);

		const outputFile = `resume_match_${Date.now()}.json`;
		await Bun.write(outputFile, JSON.stringify(report, null, 2));
		console.log(`\n💾 Saved to: ${outputFile}`);
		console.log("\n✅ Done!\n");
	} catch (error) {
		console.error("\n❌ Error generating resume match report:");
		console.error(error);
		process.exit(1);
	}
}

function parseMatchArgs(args: string[]): ResumeMatchInput {
	let resumePath = "";
	let targetRole = "Software Engineer";
	let githubUsername = "";
	const repos: string[] = [];

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		if (arg === "--resume") {
			resumePath = args[i + 1] || "";
			i++;
			continue;
		}

		if (arg === "--repos") {
			const value = args[i + 1] || "";
			const parsedRepos = value
				.split(",")
				.map((repo) => repo.trim())
				.filter(Boolean);
			repos.push(...parsedRepos);
			i++;
			continue;
		}

		if (arg === "--role") {
			targetRole = args[i + 1] || targetRole;
			i++;
			continue;
		}

		if (arg === "--username") {
			githubUsername = args[i + 1] || "";
			i++;
			continue;
		}
	}

	return {
		resumePath,
		repos,
		targetRole,
		githubUsername,
	};
}

main();
