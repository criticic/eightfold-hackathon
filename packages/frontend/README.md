# Frontend Package

**Owner**: Person 1 & 2

## Responsibilities

### Person 1: Recruiter Portal
- Recruiter landing page
- Repo input form (accept 3-4 GitHub URLs)
- JD display with syntax highlighting
- Candidate evaluation interface
- Loading states & animations

### Person 2: Candidate Portal
- Candidate landing page
- GitHub username input
- Resume upload (optional)
- Skills verification report display
- Match score visualization
- Evidence display (which repos prove which skills)

## Setup

```bash
cd packages/frontend

# Person 1 & 2: Initialize Next.js here
# npm create next-app@latest .
# or use your preferred setup
```

## Tech Stack

- Next.js 14+ (App Router)
- React 18+
- Tailwind CSS
- TypeScript
- Axios (API client)
- Recharts (data visualization)
- Lucide React (icons)

## File Structure (Suggested)

```
frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Landing page
│   │   ├── recruiter/
│   │   │   ├── page.tsx          # Recruiter portal (Person 1)
│   │   │   └── analyze/
│   │   │       └── page.tsx      # Repo analysis view
│   │   └── candidate/
│   │       ├── page.tsx          # Candidate portal (Person 2)
│   │       └── verify/
│   │           └── page.tsx      # Verification results
│   ├── components/
│   │   ├── RepoInput.tsx         # Person 1
│   │   ├── JDDisplay.tsx         # Person 1
│   │   ├── SkillsReport.tsx      # Person 2
│   │   └── MatchScore.tsx        # Person 2
│   └── lib/
│       └── api.ts                # Shared API client
└── package.json
```

## Integration Points

- Backend API: `http://localhost:8000/api`
- See `shared/CONTRACTS.md` for API specifications
- Use mock data until backend is ready (Hour 2)

## Development Timeline

### Hour 1
- Set up Next.js project
- Create basic routing structure
- Start with mock data

### Hour 2-3
- Build UI components
- Style with Tailwind
- Connect to backend API (once available)

### Hour 4-5
- Polish interactions
- Add loading states
- Error handling

### Hour 6
- Final testing
- Demo preparation
