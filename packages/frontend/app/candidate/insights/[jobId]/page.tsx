"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { TopNav } from "@/components/top-nav";
import { api } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import type { JobPosting } from "@/lib/types";

export default function CandidateInsightsPage() {
  const params = useParams<{ jobId: string }>();
  const [job, setJob] = useState<JobPosting | null>(null);
  const [repos, setRepos] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.candidateJob(params.jobId)
      .then(setJob)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load job"));
  }, [params.jobId]);

  async function onMatch(e: FormEvent) {
    e.preventDefault();
    if (!job) return;
    const user = getSessionUser();
    if (!user) return;

    setLoading(true);
    setError("");
    try {
      const response = await api.candidateMatch({
        repos: repos.split("\n").map((item) => item.trim()).filter(Boolean),
        github_username: user.username,
        jd_text: job.detailed_jd || job.jd_text || "",
        resume_text: resumeText,
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to compute match");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthGuard role="candidate">
      <main>
        <TopNav />
        <div className="card" style={{ marginBottom: 12 }}>
          <h1>Match Insight</h1>
          <p className="muted">Understand why you fit this role and what to improve.</p>
          {job ? <p><strong>{job.title}</strong></p> : <p className="muted">Loading job...</p>}
        </div>
        <div className="card" style={{ marginBottom: 12 }}>
          <form onSubmit={onMatch}>
            <div style={{ marginBottom: 10 }}>
              <label>Your repos (one per line)</label>
              <textarea rows={4} value={repos} onChange={(e) => setRepos(e.target.value)} required />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label>Resume text</label>
              <textarea rows={6} value={resumeText} onChange={(e) => setResumeText(e.target.value)} required />
            </div>
            {error ? <p style={{ color: "#8f2d1e" }}>{error}</p> : null}
            <button disabled={loading}>{loading ? "Analyzing..." : "Generate insight"}</button>
          </form>
        </div>
        {result ? (
          <div className="card">
            <h2>Insight Output</h2>
            <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(result, null, 2)}</pre>
          </div>
        ) : null}
      </main>
    </AuthGuard>
  );
}
