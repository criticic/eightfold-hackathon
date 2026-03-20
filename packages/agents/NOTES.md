## Why Multi-Step Agentic System > Simple LLM Call

### Traditional Approach (Bad for 6 hours)
```typescript
// Read ALL files from repo
const allFiles = await fetchAllRepoFiles(repoUrl); // Could be 1000s of files

// Send everything to LLM in one shot
const jd = await llm.generate(`Analyze these ${allFiles.length} files and create JD`);
```

**Problems:**
- ❌ Hits context limits (1000s of files won't fit)
- ❌ Wastes tokens on irrelevant files
- ❌ No reasoning visible
- ❌ Can't adapt exploration based on findings

### Agentic Approach (Perfect for hackathon)
```typescript
// Agent explores iteratively
const agent = createAgent({
  tools: ['read_file', 'list_files', 'analyze_code'],
  systemPrompt: 'Explore repos and generate JD...'
});

// Agent decides what to read
// Iteration 1: "Let me check package.json"
// Iteration 2: "I see React, let me read App.tsx"
// Iteration 3: "I understand the stack, generating JD..."

const jd = await agent.run(repoUrls);
```

**Benefits:**
- ✅ Reads only ~10-20 files (smart sampling)
- ✅ Adapts based on findings (if sees Django, explores Python files)
- ✅ Reasoning is visible (show agent's thought process)
- ✅ Explainable (cite specific files as evidence)
- ✅ Cheaper (fewer tokens)
- ✅ **Impressive demo** - Judge sees agent thinking in real-time

## Integration with Backend (Person 3)

### Simple API Wrapper
```typescript
// backend/src/routes/recruiter.ts
import { generateJDFromRepos } from '@truthtalent/agents';

app.post('/api/recruiter/generate-jd', async ({ body }) => {
  const { repo_urls } = body;
  
  // Call agent (Person 4's code)
  const result = await generateJDFromRepos(repo_urls, {
    onProgress: (step) => {
      // Send via WebSocket to frontend
      ws.send({ type: 'progress', message: step });
    }
  });
  
  // Cache result
  await cache.set(repo_urls.join(','), result);
  
  return { success: true, data: result };
});
```

## Smart Code Sampling Strategy

Don't analyze entire repos. Sample strategically:

### Phase 1: Metadata
1. Read README.md (project overview)
2. Read package.json / requirements.txt / Gemfile (dependencies)
3. Read .github/workflows/* (CI/CD, gives tech hints)

### Phase 2: Core Files
4. Read main entry file (index.ts, main.py, app.py)
5. Read 1-2 core module files (most important business logic)

### Phase 3: Verification (if needed)
6. If uncertain about framework, read specific config
7. If uncertain about patterns, read 1-2 more files

**Total: ~8-15 files per repo, ~30-50 files for 3 repos**

## Prompt Engineering for Agents

### Good Agent System Prompt
```typescript
const GOOD_PROMPT = `
You are exploring GitHub repos to generate a JD.

STRATEGY:
1. Start with config files (package.json, etc.) - high signal
2. Read entry points (index.ts, main.py) - shows architecture  
3. Read 1-2 core files - confirms patterns
4. When you understand the stack, call finish()

RULES:
- Only cite files you've actually read
- If unsure, read more files (but max 15 files per repo)
- Don't guess - if you haven't seen code, don't claim it
`;
```

### Bad Agent System Prompt
```typescript
const BAD_PROMPT = `
Analyze repos and create JD.
`; // Too vague, agent will explore randomly
```

## Cost Optimization Tips

### Use Gemini Flash (Not GPT-4)
- Gemini Flash: $0.10 per 1M input tokens
- GPT-4: $5.00 per 1M input tokens
- **50x cheaper**

### Cache Aggressively
```typescript
// Cache repo analysis
const cacheKey = `repo:${repoUrl}`;
const cached = await db.get(cacheKey);
if (cached) return cached;

const result = await agent.explore(repoUrl);
await db.set(cacheKey, result, { ttl: 3600 }); // 1 hour
```

### Limit Iterations
```typescript
const agent = createAgent({
  maxIterations: 15, // Don't let agent run forever
  maxFilesPerRepo: 20, // Hard limit on file reads
});
```

## Demo Value

### What Judge Sees (Frontend)

**Without Agent System:**
```
[Loading spinner]
... 30 seconds ...
[Result appears]
```

**With Agent System:**
```
Analyzing vercel/next.js...
  → Reading package.json... Found TypeScript, React
  → Reading src/index.tsx... Detected server-side rendering
  → Reading server/base-server.ts... Node.js server architecture
  → Reading build/webpack/... Build tooling confirmed
  → Analysis complete. Generating JD...
  
[Result appears with reasoning chain visible]
```

**Judge's reaction:** "Wow, it's actually exploring the codebase like a human would!"

## Success Metrics for Person 4

By Hour 6, agent should be able to:
- ✅ Generate JD from 3 repos in <60 seconds
- ✅ Cite specific files as evidence for each skill
- ✅ Not hallucinate skills (only mention what's in code)
- ✅ Cost per analysis: <$0.01
- ✅ Reasoning chain visible to user

