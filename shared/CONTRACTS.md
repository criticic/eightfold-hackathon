# API Contracts

**Owner**: Person 3  
**Consumers**: Person 1 & 2 (Frontend)

This document defines the API contract between frontend and backend. Person 3 should share this with the frontend team by **Hour 1**.

## Base URL

```
Development: http://localhost:8000/api
Production: TBD
```

## Common Response Format

```typescript
// Success
{
  "success": true,
  "data": {...}
}

// Error
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message"
  }
}
```

---

## Recruiter Endpoints

### 1. Analyze Repositories

**Endpoint**: `POST /api/recruiter/analyze-repos`

**Description**: Analyze 3-4 GitHub repositories to extract tech stack

**Request Body**:
```typescript
{
  "repo_urls": string[]  // ["https://github.com/user/repo1", ...]
}
```

**Response**:
```typescript
{
  "success": true,
  "data": {
    "repos": [
      {
        "url": string,
        "name": string,
        "languages": {
          "Python": number,      // Percentage
          "TypeScript": number,
          ...
        },
        "tech_stack": string[],  // ["React", "FastAPI", "PostgreSQL"]
        "complexity_score": number,  // 0-100
        "stars": number,
        "contributors": number
      }
    ],
    "aggregated_tech_stack": {
      "languages": string[],     // Top languages across all repos
      "frameworks": string[],
      "tools": string[]
    }
  }
}
```

**Status Codes**:
- `200`: Success
- `400`: Invalid repo URLs
- `429`: GitHub API rate limit exceeded
- `500`: Server error

---

### 2. Generate Job Description

**Endpoint**: `POST /api/recruiter/generate-jd`

**Description**: Generate job description from analyzed repositories

**Request Body**:
```typescript
{
  "analyzed_repos": {
    "repos": [...],           // From analyze-repos response
    "aggregated_tech_stack": {...}
  },
  "role_title": string,       // Optional: "Senior Backend Engineer"
  "experience_level": string  // Optional: "Senior", "Mid-level", "Junior"
}
```

**Response**:
```typescript
{
  "success": true,
  "data": {
    "jd_text": string,        // Full formatted JD
    "required_skills": [
      {
        "skill": string,      // "Python"
        "level": string,      // "Advanced"
        "evidence": string    // "Used in 3/4 repos, 85% of codebase"
      }
    ],
    "nice_to_have_skills": string[]
  }
}
```

---

### 3. Evaluate Candidate

**Endpoint**: `POST /api/recruiter/evaluate-candidate`

**Description**: Match a candidate's GitHub profile to a job description

**Request Body**:
```typescript
{
  "github_username": string,
  "jd_text": string,          // From generate-jd or custom JD
  "required_skills": string[] // Optional: override from JD
}
```

**Response**:
```typescript
{
  "success": true,
  "data": {
    "match_score": number,        // 0-100
    "matched_skills": string[],
    "missing_skills": string[],
    "reasoning": string,          // Explainable reasoning
    "candidate_summary": {
      "username": string,
      "total_repos": number,
      "total_commits": number,
      "primary_languages": string[]
    },
    "skill_breakdown": [
      {
        "skill": string,
        "required": boolean,
        "candidate_level": string,  // "expert", "intermediate", "beginner", "none"
        "evidence": [
          {
            "repo": string,
            "loc": number,
            "commits": number
          }
        ]
      }
    ]
  }
}
```

---

## Candidate Endpoints

### 4. Verify GitHub Profile

**Endpoint**: `POST /api/candidate/verify`

**Description**: Extract and verify skills from GitHub profile

**Request Body**:
```typescript
{
  "github_username": string,
  "resume_text": string | null  // Optional: for cross-verification
}
```

**Response**:
```typescript
{
  "success": true,
  "data": {
    "username": string,
    "profile_url": string,
    "verified_skills": [
      {
        "skill": string,        // "Python"
        "level": string,        // "expert", "intermediate", "beginner"
        "confidence": number,   // 0-100
        "evidence": [
          {
            "repo": string,
            "repo_url": string,
            "loc": number,      // Lines of code
            "commits": number,
            "last_commit": string  // ISO date
          }
        ]
      }
    ],
    "mismatches": [             // Only if resume_text provided
      {
        "claimed_skill": string,
        "claimed_level": string,
        "actual_level": string,
        "explanation": string
      }
    ],
    "summary": {
      "total_repos": number,
      "total_commits": number,
      "languages": {
        "Python": number,     // Total LOC
        ...
      },
      "most_active_repo": string,
      "recent_activity": boolean  // Active in last 6 months
    }
  }
}
```

---

### 5. Match to Job Description

**Endpoint**: `POST /api/candidate/match`

**Description**: Match candidate to a specific job description

**Request Body**:
```typescript
{
  "github_username": string,
  "jd_text": string
}
```

**Response**:
```typescript
{
  "success": true,
  "data": {
    "match_score": number,      // 0-100
    "fit_level": string,        // "excellent", "good", "fair", "poor"
    "matched_skills": [
      {
        "skill": string,
        "required_level": string,
        "candidate_level": string,
        "match": boolean
      }
    ],
    "missing_skills": [
      {
        "skill": string,
        "importance": string,   // "required", "preferred"
        "learning_distance": string  // "easy", "medium", "hard"
      }
    ],
    "reasoning": string,        // Explainable reasoning
    "recommendations": {
      "should_apply": boolean,
      "strengths": string[],
      "areas_to_improve": string[]
    }
  }
}
```

---

## WebSocket Endpoint (Optional - Hour 5)

**Endpoint**: `WS /api/ws/analyze`

**Description**: Real-time updates during long-running analysis

**Message Format**:
```typescript
// Client sends
{
  "action": "analyze_repos",
  "data": {
    "repo_urls": string[]
  }
}

// Server sends (progress updates)
{
  "type": "progress",
  "message": "Analyzing repository 1/4...",
  "progress": 25
}

// Server sends (completion)
{
  "type": "complete",
  "data": {...}  // Same as HTTP response
}

// Server sends (error)
{
  "type": "error",
  "error": {
    "code": "ERROR_CODE",
    "message": "Error message"
  }
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_GITHUB_URL` | Malformed GitHub repository URL |
| `REPO_NOT_FOUND` | GitHub repository doesn't exist |
| `USER_NOT_FOUND` | GitHub user doesn't exist |
| `RATE_LIMIT_EXCEEDED` | GitHub API rate limit hit |
| `INVALID_JD` | Job description is empty or invalid |
| `ANALYSIS_FAILED` | Agent analysis failed |
| `INTERNAL_ERROR` | Server error |

---

## Example Usage

### Frontend Example (TypeScript)

```typescript
// lib/api.ts
const API_BASE = 'http://localhost:8000/api';

export async function analyzeRepos(repoUrls: string[]) {
  const response = await fetch(`${API_BASE}/recruiter/analyze-repos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repo_urls: repoUrls })
  });
  
  const result = await response.json();
  if (!result.success) {
    throw new Error(result.error.message);
  }
  
  return result.data;
}

export async function verifyGitHub(username: string) {
  const response = await fetch(`${API_BASE}/candidate/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ github_username: username })
  });
  
  return await response.json();
}
```

---

## Testing

Use these test GitHub profiles for development:

- `torvalds` - Linus Torvalds (C expert, no Python)
- `gaearon` - Dan Abramov (React expert)
- `tj` - TJ Holowaychuk (Go, Node.js)
- `sindresorhus` - Sindre Sorhus (TypeScript, many repos)

---

## Notes for Person 3

- Implement CORS for `http://localhost:3000`
- Add request validation using Pydantic models
- Cache GitHub API responses (same username/repo = cached result)
- Set reasonable timeouts (30s for analysis)
- Use async/await for all I/O operations
- Log all errors for debugging

## Notes for Person 1 & 2

- Use mock data until backend is ready (Hour 2)
- Handle loading states (analysis takes 5-10 seconds)
- Display friendly error messages
- Add retry logic for failed requests
- Show progress indicators for long operations
