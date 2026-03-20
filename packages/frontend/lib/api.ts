import type {
  ApiResponse,
  ApplicationRecord,
  CandidateListItem,
  CandidateProfile,
  EvaluationDetail,
  JobPosting,
} from "./types";

const RAW_API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

function buildUrl(path: string): string {
  const base = RAW_API_BASE.replace(/\/$/, "");
  if (base.endsWith("/api") && path.startsWith("/api/")) {
    return `${base}${path.slice(4)}`;
  }
  return `${base}${path}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(buildUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  const raw = (await res.json()) as Record<string, unknown>;
  if (!("success" in raw)) {
    const message = typeof raw.message === "string" ? raw.message : `Request failed (${res.status})`;
    throw new Error(message);
  }

  const json = raw as ApiResponse<T>;
  if (!json.success) {
    const fallback = `Request failed (${res.status})`;
    const message =
      typeof json.error.message === "string"
        ? json.error.message
        : typeof raw.message === "string"
          ? raw.message
          : fallback;
    throw new Error(message);
  }
  return json.data;
}

export const api = {
  signup: (payload: { username: string; password: string; role: "candidate" | "recruiter" }) =>
    request<{ id: number; username: string; role: string; created_at: number }>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  login: (payload: { username: string; password: string; role?: "candidate" | "recruiter" }) =>
    request<{ id: number; username: string; role: string; created_at: number }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  recruiterJobs: () => request<JobPosting[]>("/api/recruiter/jobs"),
  recruiterJob: (id: string | number) => request<JobPosting>(`/api/recruiter/jobs/${id}`),
  candidateJobs: () => request<JobPosting[]>("/api/candidate/jobs"),
  candidateJob: (id: string | number) => request<JobPosting>(`/api/candidate/jobs/${id}`),

  createJD: (payload: {
    repos: string[];
    rough_jd: string;
    publish?: boolean;
    location?: string;
    employment_type?: string;
    experience_level?: string;
  }) => request<{ job_id: number } & Record<string, unknown>>("/api/recruiter/generate-jd", { method: "POST", body: JSON.stringify(payload) }),

  evaluateCandidate: (payload: {
    job_id?: number;
    github_username?: string;
    jd_text: string;
    candidate_repos: string[];
    resume_text?: string;
    target_role?: string;
    required_skills?: string[];
  }) => request<EvaluationDetail>("/api/recruiter/evaluate-candidate", { method: "POST", body: JSON.stringify(payload) }),

  recruiterCandidates: (jobId?: string | number, sort: "match_score" | "recency" | "confidence" = "match_score") => {
    const qs = new URLSearchParams();
    if (jobId) qs.set("job_id", String(jobId));
    qs.set("sort", sort);
    return request<CandidateListItem[]>(`/api/recruiter/candidates?${qs.toString()}`);
  },

  recruiterCandidate: (username: string) =>
    request<{
      github_username: string;
      best_match_score: number;
      evaluations: EvaluationDetail[];
    }>(`/api/recruiter/candidates/${username}`),

  evaluationTrace: (id: string | number) =>
    request<{
      evaluation_id: number;
      trace: Array<{ id: number; run_type: string; created_at: number; trace: Record<string, unknown> }>;
    }>(`/api/recruiter/evaluations/${id}/trace`),

  verifyCandidate: (payload: {
    repos: string[];
    target_role?: string;
    github_username?: string;
    resume_text?: string;
  }) => request<Record<string, unknown>>("/api/candidate/verify", { method: "POST", body: JSON.stringify(payload) }),

  candidateMatch: (payload: { repos: string[]; github_username?: string; jd_text: string; resume_text?: string }) =>
    request<Record<string, unknown>>("/api/candidate/match", { method: "POST", body: JSON.stringify(payload) }),

  applyToJob: (payload: { job_id: number; candidate_username: string; notes?: string }) =>
    request<{ id: number; job_id: number; candidate_username: string; status: string }>("/api/candidate/applications", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  myApplications: (username: string) => request<ApplicationRecord[]>(`/api/candidate/applications?username=${encodeURIComponent(username)}`),

  updateApplicationStatus: (id: number, payload: { status: string; notes?: string }) =>
    request<{ id: number; status: string; notes?: string }>(`/api/recruiter/applications/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  recruiterApplications: (jobId?: number) =>
    request<ApplicationRecord[]>(jobId ? `/api/recruiter/applications?job_id=${jobId}` : "/api/recruiter/applications"),

  candidateProfile: (username: string) => request<CandidateProfile>(`/api/candidate/profiles/${username}`),
};
