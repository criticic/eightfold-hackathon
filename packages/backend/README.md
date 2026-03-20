# Backend Package

**Owner**: Person 3

## Responsibilities

- Elysia backend setup (TypeScript)
- API endpoints for both portals
- Orchestrate agent calls
- Response caching (prevent re-analyzing same repos)
- WebSocket support for streaming updates
- Authentication with Better Auth
- SQLite database with Drizzle ORM

## Setup

```bash
cd packages/backend

# Install dependencies
bun install

# Run database migrations
bun run db:migrate

# Start development server
bun run dev
```

## Current Status

- Elysia server scaffolded in `src/index.ts`
- Better Auth mounted at `POST/GET /api/auth/*`
- Drizzle + SQLite configured in `src/db/*` and `drizzle.config.ts`
- Recruiter routes in `src/routes/recruiter.ts`
- Candidate routes in `src/routes/candidate.ts`
- SQLite cache service in `src/services/cache.ts`

## Tech Stack

- **Elysia** - Fast Bun web framework with type safety
- **Better Auth** - Authentication & session management
- **Drizzle ORM** - Type-safe SQL with SQLite
- **Bun** - JavaScript runtime & package manager
- **TypeScript** - Type safety throughout
- **WebSockets** - Real-time updates (built into Elysia)

## File Structure (Suggested)

```
backend/
├── src/
│   ├── index.ts             # Elysia app entry point
│   ├── routes/
│   │   ├── recruiter.ts     # /api/recruiter/* routes
│   │   └── candidate.ts     # /api/candidate/* routes
│   ├── db/
│   │   ├── schema.ts        # Drizzle schema definitions
│   │   ├── index.ts         # Database connection
│   │   └── migrations/      # Auto-generated migrations
│   ├── auth/
│   │   └── index.ts         # Better Auth configuration
│   ├── services/
│   │   ├── orchestrator.ts  # Coordinates agents
│   │   └── cache.ts         # Response caching
│   └── types/
│       └── index.ts         # Shared types
├── data/                    # gitignored - SQLite database
│   └── db.sqlite
├── package.json
├── tsconfig.json
└── README.md
```

## API Endpoints to Implement

See `shared/CONTRACTS.md` for detailed specifications.

### Recruiter Endpoints
- `POST /api/recruiter/analyze-repos` - Analyze GitHub repos
- `POST /api/recruiter/generate-jd` - Generate job description
- `POST /api/recruiter/evaluate-candidate` - Match candidate to JD

### Candidate Endpoints
- `POST /api/candidate/verify` - Verify GitHub profile
- `POST /api/candidate/match` - Match to job description

## Database Schema (Drizzle)

```typescript
// src/db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// Analysis cache table
export const analysisCache = sqliteTable('analysis_cache', {
  id: integer('id').primaryKey(),
  cache_key: text('cache_key').notNull().unique(),
  cache_type: text('cache_type').notNull(), // 'repo' | 'user' | 'match'
  data: text('data').notNull(), // JSON stringified
  created_at: integer('created_at').notNull(),
  expires_at: integer('expires_at'),
});

// User sessions (Better Auth handles this automatically)
// Job postings saved by recruiters
export const jobPostings = sqliteTable('job_postings', {
  id: integer('id').primaryKey(),
  user_id: text('user_id'),
  title: text('title').notNull(),
  jd_text: text('jd_text').notNull(),
  required_skills: text('required_skills').notNull(), // JSON array
  created_at: integer('created_at').notNull(),
});

// Candidate evaluations
export const evaluations = sqliteTable('evaluations', {
  id: integer('id').primaryKey(),
  job_posting_id: integer('job_posting_id'),
  github_username: text('github_username').notNull(),
  match_score: integer('match_score').notNull(),
  evaluation_data: text('evaluation_data').notNull(), // JSON
  created_at: integer('created_at').notNull(),
});
```

## Integration Points

- **Agents package**: Import functions from `packages/agents/`
- **Frontend**: CORS enabled for `http://localhost:3000`
- **Database**: SQLite stored in `data/db.sqlite` (gitignored)
- **Auth**: Better Auth handles sessions, CSRF protection

## Development Timeline

### Hour 1
- **CRITICAL**: Define API contracts and share with frontend team
- Elysia setup with Better Auth
- Database schema with Drizzle
- Basic endpoints with mock responses
- CORS configuration

### Hour 2-3
- Integrate agent functions from Person 4
- Implement recruiter endpoints
- Implement candidate endpoints
- Caching layer with SQLite

### Hour 4-5
- WebSocket for real-time updates
- Error handling & validation
- Session management

### Hour 6
- Testing with frontend
- Performance optimization
- Bug fixes

## Dependencies to Install

```bash
# Person 3 will run these commands
bun add elysia
bun add better-auth
bun add drizzle-orm
bun add -d drizzle-kit
```

## Key Elysia Features to Use

### 1. Type-Safe Routing
```typescript
import { Elysia, t } from 'elysia';

const app = new Elysia()
  .post('/api/recruiter/analyze-repos', async ({ body }) => {
    // body is type-safe!
    return { success: true, data: {...} };
  }, {
    body: t.Object({
      repo_urls: t.Array(t.String())
    })
  });
```

### 2. WebSocket Support
```typescript
app.ws('/api/ws/analyze', {
  message(ws, message) {
    // Handle incoming messages
    ws.send({ type: 'progress', progress: 50 });
  }
});
```

### 3. Better Auth Integration
```typescript
import { betterAuth } from 'better-auth';

const auth = betterAuth({
  database: drizzle(db),
  // ... config
});

app.use(auth.handler);
```

### 4. CORS
```typescript
import { cors } from '@elysiajs/cors';

app.use(cors({
  origin: 'http://localhost:3000'
}));
```

## Environment Variables

```bash
# .env
DATABASE_URL=data/db.sqlite
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=http://localhost:8000
PORT=8000
```

## Quick Start Commands

```bash
# Install dependencies
bun install

# Generate database migrations
bun run db:generate

# Run migrations
bun run db:migrate

# Start dev server
bun run dev

# Open Drizzle Studio (database GUI)
bun run db:studio
```
