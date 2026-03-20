"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { TopNav } from "@/components/top-nav";
import { api } from "@/lib/api";
import type { CandidateListItem, JobPosting } from "@/lib/types";

export default function RecruiterJobCandidatesPage() {
  const params = useParams<{ jdId: string }>();
  const [job, setJob] = useState<JobPosting | null>(null);
  const [rows, setRows] = useState<CandidateListItem[]>([]);
  const [sort, setSort] = useState<"match_score" | "recency" | "confidence">("match_score");
  const [githubUsername, setGithubUsername] = useState("");
  const [candidateRepos, setCandidateRepos] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const [j, c] = await Promise.all([api.recruiterJob(params.jdId), api.recruiterCandidates(params.jdId, sort)]);
    setJob(j);
    setRows(c);
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : "Failed to load candidates"));
  }, [params.jdId, sort]);

  async function onEvaluate(e: FormEvent) {
    e.preventDefault();
    if (!job) return;
    setLoading(true);
    setError("");
    try {
      await api.evaluateCandidate({
        job_id: Number(params.jdId),
        github_username: githubUsername,
        jd_text: job.detailed_jd || job.jd_text || "",
        candidate_repos: candidateRepos.split("\n").map((item) => item.trim()).filter(Boolean),
        resume_text: resumeText,
      });
      setGithubUsername("");
      setCandidateRepos("");
      setResumeText("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Evaluation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthGuard role="recruiter">
      <main>
        <TopNav />
        <div className="card" style={{ marginBottom: 12 }}>
          <h1>Ranked Candidates</h1>
          <p className="muted">Evaluate candidates against this JD and inspect explanation traces.</p>
          <div className="row" style={{ alignItems: "center" }}>
            <label>Sort</label>
            <select value={sort} onChange={(e) => setSort(e.target.value as "match_score" | "recency" | "confidence")} style={{ maxWidth: 240 }}>
              <option value="match_score">Best match score</option>
              <option value="confidence">Highest confidence</option>
              <option value="recency">Most recent</option>
            </select>
          </div>
          {rows.map((item) => (
            <div key={item.github_username} style={{ borderTop: "1px solid var(--border)", padding: "10px 0" }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <Link href={`/recruiter/candidates/${item.github_username}`}>{item.github_username}</Link>
                <strong>{item.latest_match_score}</strong>
              </div>
              <p className="muted">Confidence {item.confidence} • Matched {item.matched_count} • Missing {item.missing_count}</p>
            </div>
          ))}
        </div>

        <div className="card">
          <h2>Evaluate New Candidate</h2>
          <form onSubmit={onEvaluate}>
            <div style={{ marginBottom: 10 }}>
              <label>GitHub username</label>
              <input value={githubUsername} onChange={(e) => setGithubUsername(e.target.value)} required />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label>Candidate repos (one per line)</label>
              <textarea rows={4} value={candidateRepos} onChange={(e) => setCandidateRepos(e.target.value)} required />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label>Resume text</label>
              <textarea rows={6} value={resumeText} onChange={(e) => setResumeText(e.target.value)} required />
            </div>
            {error ? <p style={{ color: "#8f2d1e" }}>{error}</p> : null}
            <button disabled={loading}>{loading ? "Evaluating..." : "Evaluate candidate"}</button>
          </form>
        </div>
      </main>
    </AuthGuard>
  );
}
