# TruthTalent Agents

Agentic system for generating evidence-based job descriptions from GitHub repositories.

## Architecture

This package implements a multi-step agentic system inspired by [pi-mono](https://github.com/badlogic/pi-mono) that:

1. **Explores GitHub repositories** using specialized tools (list files, read files, get repo info)
2. **Reasons iteratively** about what it finds using Google Gemini Flash
3. **Generates job descriptions** backed by actual code evidence
4. **Creates two versions**: detailed (internal) and anonymized (public)

## Features

- 🤖 **Agentic exploration**: Agent decides which files to read based on findings
- 📊 **Evidence-based**: Every technical requirement backed by specific files
- 🔒 **Privacy-aware**: Generates both detailed and anonymized versions
- 💰 **Cost-effective**: Uses Gemini Flash (~$0.003 per JD generation)
- 🎯 **Smart sampling**: Reads ~10-15 key files per repo, not everything

## Setup

1. **Install dependencies**:
```bash
bun install
```

2. **Set environment variables**:
```bash
# Required
export GOOGLE_API_KEY="your-gemini-api-key"

# Optional (for higher GitHub rate limits)
export GITHUB_TOKEN="your-github-token"
```

Or use a local env file:

```bash
cp .env.example .env
```

Get your Gemini API key from: https://aistudio.google.com/app/apikey

## Usage

### CLI

Generate a JD from GitHub repositories:

```bash
bun run src/cli.ts <repo1> <repo2> [...] -- "<rough_jd_context>"

# Explicit subcommand form
bun run src/cli.ts jd <repo1> <repo2> [...] -- "<rough_jd_context>"

# Resume (PDF/text) to GitHub verification report
bun run src/cli.ts match --resume ./resume.pdf --repos vercel/next.js,vercel/turbo --role "Frontend engineer"
```

**Examples**:

```bash
# Analyze Vercel's repos for a frontend build tools role
bun run src/cli.ts vercel/next.js vercel/turbo -- "Frontend engineer for build tools team"

# Analyze Supabase for a backend database role
bun run src/cli.ts supabase/supabase supabase/postgres -- "Backend engineer working on database infrastructure"

# Single repo analysis
bun run src/cli.ts shadcn/ui -- "Frontend engineer for UI component library"
```

### Programmatic Usage

```typescript
import { JDGenerator } from "@truthtalent/agents";

const generator = new JDGenerator(process.env.GITHUB_TOKEN);

const jd = await generator.generateJD({
  repos: ["vercel/next.js", "vercel/turbo"],
  rough_jd: "Frontend engineer for build tools team",
});

console.log(jd.detailed_version);
console.log(jd.anonymized_version);
```

## How It Works

### 1. Agent Tools

The agent has access to these tools:

- **get_repo_info**: Get high-level repo metadata (languages, description, topics)
- **list_repo_files**: List files/directories at a specific path
- **read_repo_file**: Read file contents (up to 50KB per file)
- **search_repo_files**: Search for files by name pattern
- **think**: Reason out loud about findings and plan next steps

### 2. Agent Loop

The agent follows this workflow:

```
User Prompt → LLM (Gemini) → Tool Calls → Execute Tools → Results → LLM → ...
                                                                      ↓
                                                              Final Response
```

The loop continues until:
- Agent decides it has enough information (returns final response)
- Maximum iterations reached (25 iterations = ~15 files per repo)

### 3. JD Generation Workflow

For each repository:
1. **Get repo info** to understand the project
2. **List root directory** to see structure
3. **Read config files** (package.json, requirements.txt, etc.)
4. **Explore source directories** (src/, app/, lib/, etc.)
5. **Read 2-3 key source files** to understand architecture

Then synthesize findings and generate:
- **Detailed version**: Company-specific, mentions repos/patterns/files
- **Anonymized version**: Generic, suitable for public posting
- **Evidence**: Maps technologies to specific files

### 4. Output Structure

```typescript
{
  title: "Software Engineer - Frontend Build Tools",
  company: "Vercel",
  team: "Developer Experience",
  overview: "...",
  responsibilities: ["..."],
  required_skills: {
    languages: ["TypeScript", "Rust"],
    frameworks: ["React", "Next.js"],
    tools: ["Turbopack", "SWC", "Docker"],
    technical: ["Build optimization", "Compiler design"]
  },
  preferred_skills: { ... },
  experience_level: "Senior",
  detailed_version: "Full JD with company specifics...",
  anonymized_version: "Generic public JD...",
  evidence: {
    repos_analyzed: ["vercel/next.js", "vercel/turbo"],
    key_files: ["vercel/next.js/packages/next/package.json", ...],
    technologies_found: {
      "React": ["vercel/next.js/packages/next/src/client/app-index.tsx"],
      "Turbopack": ["vercel/turbo/crates/turbopack/src/lib.rs"]
    }
  }
}
```

## Cost & Performance

### Typical Usage
- **Files read per repo**: 10-15 files
- **Tokens per JD**: ~30,000 tokens
- **Cost per JD**: ~$0.003 (Gemini Flash pricing)
- **Time**: ~60 seconds for 3 repos

### Rate Limits
- **GitHub API**: 60 requests/hour (unauthenticated), 5000/hour (with token)
- **Gemini API**: Generous free tier, then pay-per-use

## Development

### File Structure

```
packages/agents/src/
├── types.ts           # TypeScript types
├── github-tools.ts    # GitHub API tools for the agent
├── agent-loop.ts      # Core agent loop with Gemini
├── jd-generator.ts    # JD generation workflow
├── resume-matcher.ts  # Resume extraction + GitHub matching
├── cli.ts            # CLI interface
└── index.ts          # Main exports
```

### Testing

```bash
# Run with a test repo
bun run src/cli.ts octocat/hello-world -- "Test role"

# With GitHub token for higher rate limits
export GITHUB_TOKEN="ghp_your_token"
bun run src/cli.ts vercel/next.js -- "Frontend engineer"
```

## Integration with Backend

The backend (Person 3) will wrap these functions in Elysia endpoints:

```typescript
// Backend wraps the agent
import { JDGenerator } from "@truthtalent/agents";

app.post("/api/recruiter/generate-jd", async ({ body }) => {
  const generator = new JDGenerator(process.env.GITHUB_TOKEN);
  const jd = await generator.generateJD(body);
  
  // Cache in SQLite
  await db.insert(jobPostings).values(jd);
  
  return jd;
});
```

## Future Enhancements

- [ ] **Streaming progress**: WebSocket updates as agent explores
- [ ] **Candidate verification**: Verify candidate skills from their GitHub
- [ ] **Matching**: Score candidates against JD with explainability
- [ ] **Multi-model support**: Add OpenAI, Anthropic as alternatives
- [ ] **Caching**: Cache repo analyses to reduce API calls

## Troubleshooting

### "Module not found" errors
Make sure you're in the agents directory:
```bash
cd packages/agents
bun run src/cli.ts ...
```

### "GOOGLE_API_KEY is required"
Set the environment variable:
```bash
export GOOGLE_API_KEY="your-key-here"
```

### GitHub rate limit errors
Use a GitHub token:
```bash
export GITHUB_TOKEN="ghp_your_token_here"
```

Get token from: https://github.com/settings/tokens

### Agent explores too many/few files
Adjust `maxIterations` in `jd-generator.ts`:
```typescript
maxIterations: 25, // Default, ~15 files per repo
```

## Credits

Architecture inspired by:
- [pi-mono](https://github.com/badlogic/pi-mono) - Agentic coding agent
- [OpenCode](https://github.com/anomalyco/opencode) - AI coding assistant

Built with:
- [Google Gemini](https://ai.google.dev) - LLM
- [Octokit](https://github.com/octokit/octokit.js) - GitHub API
- [Bun](https://bun.sh) - Runtime
