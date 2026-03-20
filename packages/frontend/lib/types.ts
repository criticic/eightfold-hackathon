export type ApiSuccess<T> = {
  success: true;
  data: T;
  cached?: boolean;
};

export type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export type JobPosting = {
  id: number;
  title: string;
  detailed_jd?: string;
  jd_text?: string;
  anonymized_jd?: string;
  required_skills: Record<string, string[]>;
  location?: string;
  employment_type?: string;
  experience_level?: string;
  created_at: number;
  status?: string;
  repos?: string[];
};

export type CandidateListItem = {
  github_username: string;
  job_id: number | null;
  latest_match_score: number;
  evaluation_count: number;
  last_evaluated_at: number;
  confidence: number;
  matched_count: number;
  missing_count: number;
};

export type EvaluationDetail = {
  id: number;
  evaluation_id?: number;
  job_id: number | null;
  github_username: string;
  match_score: number;
  confidence: number;
  matched_count: number;
  missing_count: number;
  matched_skills: string[];
  missing_skills: string[];
  reasoning: string;
  trace?: {
    steps: Array<{
      at: number;
      action: string;
      note: string;
      repos?: string[];
      score?: number;
      recommendation?: string;
      skills?: Array<{ skill: string; confidence: string; evidence_files: string[] }>;
    }>;
  };
  candidate_summary?: {
    username: string;
    total_repos: number;
    total_commits: number;
    primary_languages: string[];
  };
  skill_breakdown?: Array<{
    skill: string;
    required: boolean;
    candidate_level: string;
    evidence: Array<{ repo: string; loc: number; commits: number }>;
  }>;
  created_at: number;
};

export type CandidateProfile = {
  github_username: string;
  latest_profile: Record<string, unknown>;
  history: Array<{
    id: number;
    created_at: number;
    profile: Record<string, unknown>;
  }>;
};

export type ApplicationRecord = {
  id: number;
  job_posting_id: number;
  candidate_username: string;
  status: string;
  notes: string | null;
  created_at: number;
  updated_at: number;
};
