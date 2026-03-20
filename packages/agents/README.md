# Agents Package

**Owner**: Person 4

## Responsibilities

- **Multi-step agentic system** for GitHub codebase exploration
- GitHub analysis agent (TypeScript)
- JD generation through iterative code analysis
- Candidate matching with evidence gathering
- Explainability layer

## Architecture Overview

This package implements a **Pi-inspired agentic system** that can:
1. **Explore repositories autonomously** - Read files, follow imports, understand code structure
2. **Reason about code** - Analyze patterns, extract tech stack, evaluate quality
3. **Generate artifacts** - Create JDs, skill reports, match evaluations
4. **Explain itself** - Show reasoning chain and evidence

### Agent Loop Flow

```
User Request: "Analyze these 3 repos and generate a JD"
    ↓
Agent spawns with tools: [read_repo_file, list_files, analyze_code, think]
    ↓
Agent Loop:
  1. LLM thinks: "I should start by reading package.json from each repo"
  2. Tool call: read_repo_file("repo1/package.json")
  3. Tool result: {...dependencies}
  4. LLM thinks: "I see React, TypeScript. Let me check the main entry point"
  5. Tool call: read_repo_file("repo1/src/index.tsx")
  6. Tool result: {code...}
  7. LLM thinks: "This uses React hooks, state management. Let me check more..."
  8. [continues exploring until satisfied]
  9. LLM: "I have enough information. Generating JD..."
  10. Final response: {jd_text, required_skills with evidence}
```

## Setup

```bash
cd packages/agents

# Install dependencies (Person 4 will add these)
bun install

# Start development
bun run dev
```

## Tech Stack

- **Agent Framework**: Custom Pi-inspired agent loop
- **Octokit** - GitHub API wrapper for TypeScript
- **Google Gemini Flash** - Fast multimodal LLM for reasoning & analysis
- **Bun** - Runtime with excellent performance
- **TypeScript** - Type safety throughout

**Why Agentic System?**
- Agent can **explore deeply** - Not limited to first few files
- Agent can **follow context** - If it sees an import, it can read that file
- Agent can **reason** - Think through what it needs before generating
- Agent **self-corrects** - Can re-read files if initial understanding was incomplete

## File Structure

```
agents/
├── src/
│   ├── core/
│   │   ├── agent.ts              # Main agent loop (Pi-inspired)
│   │   ├── tools.ts              # Tool definitions
│   │   └── state.ts              # Agent state management
│   ├── tools/
│   │   ├── github/
│   │   │   ├── read-file.ts      # Read file from GitHub repo
│   │   │   ├── list-files.ts     # List repo directory contents
│   │   │   ├── get-repo-info.ts  # Get repo metadata (stars, langs, etc.)
│   │   │   └── search-code.ts    # Search for patterns in repo
│   │   ├── analysis/
│   │   │   ├── analyze-code.ts   # LLM-based code analysis
│   │   │   ├── extract-deps.ts   # Extract dependencies from files
│   │   │   └── infer-stack.ts    # Infer tech stack from code
│   │   └── reasoning/
│   │       ├── think.ts          # Agent thinking/reasoning tool
│   │       └── summarize.ts      # Summarize findings
│   ├── workflows/
│   │   ├── generate-jd.ts        # JD generation workflow
│   │   ├── verify-candidate.ts   # Candidate verification workflow
│   │   └── match-candidate.ts    # Candidate matching workflow
│   ├── llm/
│   │   ├── gemini.ts             # Gemini Flash client
│   │   └── prompts.ts            # System prompts for agent
│   └── index.ts                  # Export main functions
├── package.json
├── tsconfig.json
└── README.md
```

## Key Functions to Deliver

### Hour 2 Deliverables (CRITICAL for Person 3)

```typescript
// src/index.ts - Main entry point for backend

/**
 * Generate JD from repositories using agentic exploration
 * 
 * The agent will:
 * 1. Clone/fetch repos via Octokit
 * 2. Explore codebase autonomously (read files, follow imports)
 * 3. Reason about tech stack and patterns
 * 4. Generate JD when satisfied with understanding
 */
export async function generateJDFromRepos(
  repoUrls: string[],
  options?: {
    roleTitle?: string;
    experienceLevel?: string;
    onProgress?: (step: string) => void; // For WebSocket updates
  }
): Promise<{
  jd_text: string;
  required_skills: Array<{
    skill: string;
    level: string;
    evidence: string; // Which repos + files prove this
  }>;
  reasoning_chain: string[]; // Agent's thought process
  files_explored: number;
}> {
  // Spawn agent with JD generation workflow
  const agent = createAgent({
    workflow: 'generate-jd',
    tools: ['read_repo_file', 'list_files', 'analyze_code', 'think'],
  });
  
  const result = await agent.run({
    repos: repoUrls,
    instructions: `Explore these repositories and generate a realistic job description...`,
  });
  
  return result;
}

/**
 * Verify candidate's GitHub profile with agentic exploration
 * 
 * The agent will:
 * 1. Fetch user's repos
 * 2. Explore top repos (read code, analyze patterns)
 * 3. Extract verified skills with evidence
 * 4. Generate skill report when confident
 */
export async function verifyCandidateProfile(
  githubUsername: string,
  options?: {
    resumeText?: string; // For cross-verification
    onProgress?: (step: string) => void;
  }
): Promise<{
  username: string;
  verified_skills: Array<{
    skill: string;
    level: 'expert' | 'intermediate' | 'beginner';
    confidence: number;
    evidence: Array<{
      repo: string;
      file: string;
      snippet: string;
    }>;
  }>;
  mismatches?: Array<{
    claimed_skill: string;
    actual_level: string;
    explanation: string;
  }>;
  reasoning_chain: string[];
  files_explored: number;
}> {
  // Spawn agent with verification workflow
}
```

### Hour 4 Deliverables

```typescript
/**
 * Match candidate to JD using agentic reasoning
 * 
 * The agent will:
 * 1. Analyze JD requirements
 * 2. Explore candidate's repos for evidence
 * 3. Compare and reason about match quality
 * 4. Generate explainable match report
 */
export async function matchCandidateToJD(
  candidateData: any, // From verifyCandidateProfile
  jdText: string,
  options?: {
    onProgress?: (step: string) => void;
  }
): Promise<{
  match_score: number;
  matched_skills: string[];
  missing_skills: string[];
  reasoning: string;
  skill_breakdown: Array<{
    skill: string;
    required: boolean;
    candidate_level: string;
    evidence: string[];
  }>;
  agent_thoughts: string[]; // What the agent considered
}> {
  // Spawn agent with matching workflow
}
```

## Development Timeline

### Hour 1: Core Agent Infrastructure
- Set up agent loop (inspired by Pi)
- Define tool interfaces
- Set up Gemini Flash client
- Create basic Octokit integration
- **Coordinate with Person 3 on function signatures**

**Deliverable**: Agent can execute basic tool loop

### Hour 2: GitHub Tools Implementation
- Implement `read_repo_file` tool
- Implement `list_files` tool  
- Implement `get_repo_info` tool
- Basic code analysis tool
- **DELIVER generateJDFromRepos() function to Person 3**

**Deliverable**: Agent can explore GitHub repos autonomously

### Hour 3: JD Generation Workflow
- Build JD generation agent workflow
- System prompt for JD agent
- Multi-repo aggregation logic
- Test with sample repos (vercel/next.js, etc.)

**Deliverable**: JD generation works end-to-end

### Hour 4: Candidate Verification Workflow
- Build candidate verification workflow
- System prompt for verification agent
- Skill extraction with evidence gathering
- **DELIVER verifyCandidateProfile() to Person 3**

**Deliverable**: Candidate verification works

### Hour 5: Matching Workflow + Explainability
- Build matching workflow
- Cross-reference candidate skills vs JD
- Generate reasoning chains
- Expose agent thoughts to frontend

**Deliverable**: Matching with full explainability

### Hour 6: Polish + Edge Cases
- Resume cross-verification (if resume provided)
- Bias check (re-evaluate without demographic info)
- Error handling (rate limits, API failures)
- Optimization (reduce API calls, cache intelligently)

**Deliverable**: Production-ready agent system

## Agent Loop Implementation

```typescript
// src/core/agent.ts - Simplified Pi-inspired agent loop

interface AgentState {
  messages: Message[];
  toolCalls: ToolCall[];
  isComplete: boolean;
  reasoning: string[];
}

async function runAgentLoop(
  initialPrompt: string,
  tools: Tool[],
  systemPrompt: string,
  maxIterations = 20
): Promise<AgentResult> {
  
  const state: AgentState = {
    messages: [{ role: 'user', content: initialPrompt }],
    toolCalls: [],
    isComplete: false,
    reasoning: []
  };
  
  let iteration = 0;
  
  while (!state.isComplete && iteration < maxIterations) {
    iteration++;
    
    // Call LLM with current state
    const response = await gemini.generate({
      systemPrompt,
      messages: state.messages,
      tools: tools.map(t => t.definition)
    });
    
    // Check if agent wants to use tools
    if (response.toolCalls && response.toolCalls.length > 0) {
      // Execute tools
      for (const toolCall of response.toolCalls) {
        const tool = tools.find(t => t.name === toolCall.name);
        const result = await tool.execute(toolCall.args);
        
        state.toolCalls.push(toolCall);
        state.messages.push({
          role: 'tool',
          name: toolCall.name,
          content: JSON.stringify(result)
        });
      }
      
      // Continue loop
      continue;
    }
    
    // Check if agent called 'finish' or provided final response
    if (response.finish || !response.toolCalls) {
      state.isComplete = true;
      return {
        result: response.content,
        reasoning: state.reasoning,
        toolsUsed: state.toolCalls.length
      };
    }
  }
  
  throw new Error('Agent exceeded max iterations');
}
```

## Example Agent Execution Trace

```
User: "Generate JD from https://github.com/vercel/next.js"

[Iteration 1]
Agent thinks: "I should start by getting repo info and reading package.json"
Tool call: get_repo_info("vercel", "next.js")
Tool result: { stars: 125k, languages: { TypeScript: 89%, JavaScript: 8% }, ... }

[Iteration 2]  
Agent thinks: "TypeScript-heavy. Let me read package.json for dependencies"
Tool call: read_repo_file("vercel", "next.js", "package.json")
Tool result: { dependencies: { react: "^18.2.0", ... }, ... }

[Iteration 3]
Agent thinks: "React framework. Let me check the main entry point"
Tool call: list_files("vercel", "next.js", "packages/next/src")
Tool result: [{ name: "server", type: "directory" }, ...]

[Iteration 4]
Agent thinks: "Let me read a core server file to understand architecture"
Tool call: read_repo_file("vercel", "next.js", "packages/next/src/server/base-server.ts")
Tool result: "export class BaseServer { ... }"

[Iteration 5]
Agent thinks: "I see Node.js server architecture, React rendering, TypeScript. Let me check build tools"
Tool call: list_files("vercel", "next.js", "packages/next/src/build")
Tool result: [{ name: "webpack", type: "directory" }, { name: "babel", ... }]

[Iteration 6]
Agent thinks: "Webpack and Babel config. I have enough information about the stack."
Agent: "I'm ready to generate the JD based on what I've learned."

Final Response: {
  jd_text: "Senior Full-Stack Engineer - Next.js\n\nWe're looking for...",
  required_skills: [
    {
      skill: "TypeScript",
      level: "Advanced",
      evidence: "89% of codebase, seen in packages/next/src/server/base-server.ts and 50+ other files"
    },
    {
      skill: "React",  
      level: "Advanced",
      evidence: "Core framework, extensive React server components in packages/next/src/server/"
    },
    {
      skill: "Node.js",
      level: "Advanced", 
      evidence: "Server implementation in packages/next/src/server/base-server.ts"
    },
    {
      skill: "Webpack",
      level: "Intermediate",
      evidence: "Build tooling in packages/next/src/build/webpack/"
    }
  ],
  reasoning_chain: [
    "Read repo metadata - 125k stars, TypeScript-dominant",
    "Read package.json - React 18, many build dependencies",
    "Explored server architecture - Node.js server with React rendering",
    "Checked build system - Webpack and Babel configuration",
    "Concluded: Full-stack TypeScript/React/Node.js role with build tooling"
  ],
  files_explored: 6
}
```

## Agent Tools

The agent has access to these tools during execution:

### GitHub Tools
```typescript
// Read a file from a GitHub repository
read_repo_file(owner: string, repo: string, path: string): Promise<string>

// List files/directories in a repo
list_files(owner: string, repo: string, path?: string): Promise<FileEntry[]>

// Get repository metadata
get_repo_info(owner: string, repo: string): Promise<RepoInfo>

// Search for code patterns in repo
search_code(owner: string, repo: string, query: string): Promise<SearchResult[]>
```

### Analysis Tools
```typescript
// Analyze code snippet or file
analyze_code(code: string, context?: string): Promise<{
  languages: string[];
  frameworks: string[];
  patterns: string[];
  quality_indicators: string[];
}>

// Extract dependencies from package.json, requirements.txt, etc.
extract_dependencies(fileContent: string, fileType: string): Promise<Dependency[]>

// Infer tech stack from multiple code samples
infer_tech_stack(codeFiles: CodeFile[]): Promise<TechStack>
```

### Reasoning Tools
```typescript
// Agent thinks through a problem
think(thought: string): void  // Logs reasoning to chain

// Summarize findings so far
summarize(): string  // Reviews explored files and conclusions
```

## System Prompts for Agent

### JD Generation Agent Prompt
```typescript
const JD_GENERATION_SYSTEM_PROMPT = `
You are a technical recruiter analyzing a company's GitHub repositories to create a realistic job description.

GOAL: Explore the provided repositories and generate a job description that reflects the ACTUAL tech stack and patterns used in the codebase.

TOOLS AVAILABLE:
- read_repo_file: Read files from repos (code, configs, docs)
- list_files: List directory contents
- get_repo_info: Get repo metadata (languages, stars, etc.)
- analyze_code: Analyze code snippets
- think: Record your reasoning

WORKFLOW:
1. Start by reading key config files (package.json, requirements.txt, etc.)
2. Identify main frameworks and languages
3. Read core application files (entry points, main modules)
4. Analyze code patterns and architecture
5. Continue exploring until you understand the tech stack
6. When confident, generate the JD with evidence

RULES:
- Base JD ONLY on code you've actually read
- Cite specific files as evidence for each skill
- If you're uncertain, explore more files
- Don't guess - if you haven't seen React code, don't list React
- When satisfied with your understanding, call the 'finish' tool

OUTPUT FORMAT:
{
  jd_text: "Full job description text",
  required_skills: [
    {
      skill: "React",
      level: "Advanced",
      evidence: "Used in src/App.tsx (hooks, context), src/components/* (15 files)"
    }
  ]
}
`;
```

### Candidate Verification Agent Prompt  
```typescript
const CANDIDATE_VERIFICATION_PROMPT = `
You are a technical evaluator analyzing a candidate's GitHub profile to verify their skills.

GOAL: Explore the candidate's repositories and extract verified skills with concrete evidence.

TOOLS AVAILABLE:
- read_repo_file: Read files from candidate's repos
- list_files: List repo contents
- get_repo_info: Get repo metadata
- analyze_code: Analyze code quality
- think: Record your reasoning

WORKFLOW:
1. Get list of candidate's repositories
2. Identify top repos (by stars, activity, complexity)
3. For each top repo:
   - Read key files (README, main code files)
   - Analyze code quality and patterns
   - Extract skills with evidence
4. Continue until you have strong evidence for each skill
5. When confident, generate verification report

RULES:
- Only claim skills you've seen in actual code
- Assess skill level based on code quality, not just usage
- Beginner: Basic usage, simple patterns
- Intermediate: Good practices, moderate complexity
- Expert: Advanced patterns, clean architecture, best practices
- Quote specific code snippets as evidence

OUTPUT FORMAT:
{
  verified_skills: [
    {
      skill: "Python",
      level: "expert",
      confidence: 95,
      evidence: [
        {
          repo: "ml-pipeline",
          file: "src/trainer.py",
          snippet: "Clean async/await, type hints, decorator usage"
        }
      ]
    }
  ]
}
`;
```

## Environment Variables

```bash
# .env
GITHUB_TOKEN=ghp_...

# LLM API (choose one)
GOOGLE_GEMINI_API_KEY=...  # Recommended - fast and free tier
OPENAI_API_KEY=sk-...      # Alternative
GROQ_API_KEY=gsk_...       # Alternative (Llama models)
```

## Dependencies to Install

```bash
# Person 4 will run these
bun add octokit
bun add @google/generative-ai  # For Gemini Flash
bun add openai                  # Optional alternative
```

## Gemini Flash Example Usage

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

// Analyze code
const result = await model.generateContent({
  contents: [{
    role: 'user',
    parts: [{
      text: `Analyze this code and extract technical skills:\n\n${codeContent}`
    }]
  }],
  generationConfig: {
    temperature: 0.3, // Lower = more consistent
    responseMimeType: 'application/json', // Get structured JSON back
  }
});

const skills = JSON.parse(result.response.text());
```

## Why Multimodal LLM > Embeddings

**Advantages:**
- ✅ **Code understanding**: Gemini can actually read and understand code quality
- ✅ **Context-aware**: Understands relationships between skills (e.g., React + TypeScript)
- ✅ **Explainable**: Generates human-readable reasoning, not just similarity scores
- ✅ **Simpler stack**: No need for embedding models, vector DBs, or FAISS
- ✅ **Faster development**: One API call vs. embedding + vector search pipeline
- ✅ **Better matching**: Can evaluate "Python + FastAPI" as different from "Python + Django"

**Trade-offs:**
- ❌ Slightly higher cost (but Gemini Flash is very cheap)
- ❌ Requires API calls (but can cache aggressively)

**Solution**: Cache LLM responses in SQLite (backend's responsibility)
