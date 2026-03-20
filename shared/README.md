# Shared Types

This directory contains shared TypeScript types and utilities that can be used across packages.

## Usage

Since this is a Bun workspace, packages can reference shared types:

```typescript
// In frontend package
import type { GitHubRepo, SkillEvidence } from '../../shared/types';
```

## Files (To be added by team)

- `types.ts` - TypeScript type definitions matching API contracts
- `utils.ts` - Shared utility functions
- `constants.ts` - Shared constants (API URLs, skill categories, etc.)

## Example Types

```typescript
// types.ts
export interface GitHubRepo {
  url: string;
  name: string;
  languages: Record<string, number>;
  tech_stack: string[];
  complexity_score: number;
  stars: number;
  contributors: number;
}

export interface VerifiedSkill {
  skill: string;
  level: 'expert' | 'intermediate' | 'beginner';
  confidence: number;
  evidence: SkillEvidence[];
}

export interface SkillEvidence {
  repo: string;
  repo_url: string;
  loc: number;
  commits: number;
  last_commit: string;
}

export interface MatchResult {
  match_score: number;
  matched_skills: string[];
  missing_skills: string[];
  reasoning: string;
}
```

---

**Note**: This is optional but recommended for type safety. Team can add types as needed during development.
