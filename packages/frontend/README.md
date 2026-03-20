# Frontend Package

Next.js app for recruiter and candidate flows.

## Run

```bash
bun install
bun run dev
```

## Env

Create `packages/frontend/.env.local`:

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

## Implemented Flows

- Auth: signup/login
- Candidate: dashboard, jobs list/detail, apply, applications, profile verify, match insight
- Recruiter: dashboard, create JD, JD detail, ranked candidates, candidate detail, evaluation trace
