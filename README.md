# RecruitOS - GitHub-Verified Hiring Intelligence

> The Post-Resume Era: Architecting High-Trust Talent Intelligence

A hackathon project for Techkriti '26 × Eightfold AI that moves beyond static resume parsing to dynamically discover, verify, and match human potential using GitHub-verified signals.

## Project Structure

This is a Bun workspace monorepo with the following packages:

```
truthtalent/
├── packages/
│   ├── frontend/      # Next.js web application (Person 1 & 2)
│   ├── backend/       # Elysia backend server (Person 3)
│   └── agents/        # AI agents for GitHub analysis (Person 4)
├── shared/            # Shared types and utilities
└── package.json       # Workspace root
```

## Team Responsibilities

### Person 1: Frontend - Recruiter Portal
- Recruiter landing page
- Repo input form (3-4 GitHub URLs)
- JD display and candidate evaluation UI

### Person 2: Frontend - Candidate Portal  
- Candidate landing page
- GitHub username input & resume upload
- Skills verification report display
- Match score visualization

### Person 3: Backend Engineer
- Elysia server setup (TypeScript)
- API endpoints for both portals
- Agent orchestration
- Response caching & WebSocket support
- Authentication with Better Auth
- SQLite database with Drizzle ORM

### Person 4: AI/Agents Engineer
- GitHub analysis agent (TypeScript/Octokit)
- Matching engine (embeddings + LLM)
- Explainability layer
- JD generation with LLM

## Quick Start

```bash
# Install all dependencies
bun install

# Start development (all packages)
bun dev

# Work on specific package
cd packages/frontend && bun dev
cd packages/backend && bun dev
cd packages/agents && bun dev
```

## Environment Files

- Root: copy `.env.example` to `.env` for running monorepo commands from repo root.
- Backend: copy `packages/backend/.env.example` to `packages/backend/.env` when running backend from that folder.
- Frontend: copy `packages/frontend/.env.example` to `packages/frontend/.env.local`.
- Agents: copy `packages/agents/.env.example` to `packages/agents/.env` for standalone agent runs.

Recommended values for local dev:

```bash
# packages/frontend/.env.local
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# packages/backend/.env
PORT=8000
DATABASE_URL=./data/db.sqlite
GOOGLE_API_KEY=...
GITHUB_TOKEN=...
```

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Backend**: Elysia (Bun), TypeScript, Better Auth, Drizzle ORM
- **Database**: SQLite (local, gitignored)
- **Agents**: Octokit, Google Gemini Flash (multimodal LLM), TypeScript
- **Monorepo**: Bun workspaces

**Key Innovation**: Using Gemini Flash for code analysis and matching instead of traditional embeddings - enables true code understanding and explainability.

## Features

### Impact Area 01: Signal Extraction & Verification
- ✅ GitHub profile analysis for verified skills
- ✅ Resume vs. GitHub cross-verification
- ✅ Evidence-based skill scoring

### Impact Area 04: Glass-Box Recruiter
- ✅ Explainable match scores
- ✅ Transparent reasoning chains
- ✅ Bias-resistant evaluation

### Unique Features
- 🔥 Reverse JD Generation: Analyze company repos to create realistic job descriptions
- 🔍 Live GitHub Verification: Real-time skill validation from actual code
- 📊 Evidence Trails: Every score backed by specific repos and commits

## API Contracts

See `shared/CONTRACTS.md` for API endpoint specifications.

## Development Timeline

- **Hours 1-2**: Foundation (minimal dependencies)
- **Hours 3-4**: Core features (start integrating)
- **Hours 5-6**: Integration & polish

## License

MIT
