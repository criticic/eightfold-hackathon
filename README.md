# RecruitOS - GitHub-Verified Hiring Intelligence

> The Post-Resume Era: Architecting High-Trust Talent Intelligence

A hackathon project for Techkriti '26 × Eightfold AI that goes beyond static resumes and evaluates candidates using real GitHub evidence with transparent reasoning.

## Project Structure

This is a Bun workspace monorepo with the following packages:

```text
eightfold-hackathon/
├── packages/
│   ├── frontend/      # Next.js app for recruiter/candidate workflows
│   ├── backend/       # Elysia API, orchestration, persistence
│   └── agents/        # Gemini + GitHub analysis agents
├── shared/            # API contracts and shared utilities
└── package.json       # Bun workspace root
```

## Quick Start

```bash
# Install all dependencies
bun install

# Start development (all packages)
bun dev

# Work on specific package
bun run --filter @truthtalent/frontend dev
bun run --filter @truthtalent/backend dev
bun run --filter @truthtalent/agents dev
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

- **Frontend**: Next.js 16, React, Tailwind CSS
- **Backend**: Elysia (Bun), TypeScript, Better Auth, Drizzle ORM
- **Database**: SQLite (local, gitignored)
- **Agents**: Octokit, Google Gemini Flash (multimodal LLM), TypeScript
- **Monorepo**: Bun workspaces

**Key Innovation**: Using Gemini Flash for code analysis and matching instead of traditional embeddings - enables true code understanding and explainability.

## Features

- GitHub profile analysis for verified technical signals
- Resume + GitHub evaluation with evidence-backed scoring
- Explainable ranking with traceable reasoning
- Reverse JD generation from company repositories
- Live run logs for JD creation and candidate evaluation
- Recruiter and candidate portals with shared contracts

## API Contracts

See `shared/CONTRACTS.md` for API endpoint specifications.

## Notes

- API contracts are documented in `shared/CONTRACTS.md`.
- Local SQLite data is stored under backend paths and ignored by git.

## License

MIT
