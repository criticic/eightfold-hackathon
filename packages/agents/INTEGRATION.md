## Integration Points

- **Backend**: Backend will import agent functions and expose via API
- **Coordinate with Person 3** on function signatures (Hour 1)
- **WebSocket Updates**: Agent can send progress updates during exploration
- **Caching**: Backend should cache agent results (same repo = cached JD)

## Agent Configuration

```typescript
// Agent configuration options
interface AgentConfig {
  maxIterations?: number;        // Default: 20
  maxFilesPerRepo?: number;      // Default: 50 (prevent over-exploration)
  thinkingLevel?: 'low' | 'medium' | 'high'; // How deeply agent thinks
  timeout?: number;              // Max execution time (ms)
  onProgress?: (step: string) => void; // Progress callback
}
```

## GitHub API Rate Limits

- **Unauthenticated**: 60 requests/hour
- **Authenticated**: 5000 requests/hour
- **Solution**: 
  - Use GITHUB_TOKEN (Person 4 MUST set this)
  - Agent should be smart about file reads (don't read everything)
  - Cache file contents in memory during agent loop

## Cost Optimization

### Smart File Sampling
Agent shouldn't read entire repos. Strategy:
1. **Config files first**: package.json, requirements.txt (high signal)
2. **Entry points**: index.ts, main.py, app.py (shows architecture)
3. **Core modules**: 2-3 important files (shows patterns)
4. **Stop when confident**: Don't over-explore

### Token Usage Estimation
- Config file: ~500 tokens
- Code file: ~2k tokens  
- Agent thinking: ~1k tokens per iteration
- Typical JD generation: 10 iterations × 3k tokens = 30k tokens
- Cost: ~$0.003 per JD with Gemini Flash

### Caching Strategy
Backend must cache:
- Repo analysis results (by repo URL)
- Generated JDs (by repo URLs hash)
- Candidate profiles (by username)
- Agent should NOT re-explore same repos

## Notes for Person 4

### Agent Development Order
1. **Build tools first** - Agent is useless without tools
2. **Test tools manually** - Make sure read_repo_file works before building agent
3. **Build simple agent loop** - Get it working with 1 tool, 1 repo
4. **Add workflows** - JD generation, then verification, then matching
5. **Add explainability** - Expose reasoning chain

### Debugging Agent Loops
```typescript
// Enable debug mode to see agent's internal state
const agent = createAgent({
  debug: true, // Logs every LLM call and tool execution
  onThought: (thought) => console.log('Agent thinking:', thought),
  onToolCall: (tool, args) => console.log('Tool call:', tool, args),
});
```

### Common Pitfalls
- ❌ Agent reads 100s of files → timeout/cost
  - ✅ Limit to 10-20 files per repo
- ❌ Agent gets stuck in loop (keeps re-reading same files)
  - ✅ Track visited files, prompt agent to explore NEW files
- ❌ Agent hallucinates skills not in code
  - ✅ System prompt: "ONLY list skills you've seen in actual code you've read"

### Testing Strategy
Use known repos for testing:
- **vercel/next.js**: TypeScript, React, Node.js, Webpack
- **fastapi/fastapi**: Python, FastAPI, Pydantic, async
- **facebook/react**: JavaScript, React, Build tooling

Expected behavior:
```typescript
const jd = await generateJDFromRepos(['https://github.com/vercel/next.js']);
// Should mention: TypeScript, React, Node.js, NOT mention: Python, Java
```
