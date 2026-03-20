"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth-guard";
import { TopNav } from "@/components/top-nav";
import { api } from "@/lib/api";
import type { CandidateListItem, JobPosting } from "@/lib/types";

export default function RecruiterDashboardPage() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [candidates, setCandidates] = useState<CandidateListItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.recruiterJobs(), api.recruiterCandidates(undefined, "match_score")])
      .then(([j, c]) => {
        setJobs(j);
        setCandidates(c);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load dashboard"));
  }, []);

  return (
    <AuthGuard role="recruiter">
      <main>
        <TopNav />
        <div className="row" style={{ marginBottom: 12 }}>
          <div className="card" style={{ flex: 1 }}>
            <h3>Open Jobs</h3>
            <p className="muted">{jobs.length} jobs created</p>
            <Link href="/recruiter/jds/new">Create new JD</Link>
          </div>
          <div className="card" style={{ flex: 1 }}>
            <h3>Ranked Candidates</h3>
            <p className="muted">{candidates.length} candidates evaluated</p>
          </div>
        </div>
        {error ? <p style={{ color: "#8f2d1e" }}>{error}</p> : null}
        <div className="card" style={{ marginBottom: 12 }}>
          <h2>Jobs</h2>
          {jobs.length === 0 ? <p className="muted">No jobs yet.</p> : null}
          {jobs.map((job) => (
            <div key={job.id} style={{ padding: "8px 0", borderTop: "1px solid var(--border)" }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong>{job.title}</strong>
                <span className="badge">{job.status || "draft"}</span>
              </div>
              <p className="muted">{job.location || "Location TBD"} {job.employment_type ? `• ${job.employment_type}` : ""}</p>
              <div className="row">
                <Link href={`/recruiter/jds/${job.id}`}>View JD</Link>
                <Link href={`/recruiter/jds/${job.id}/candidates`}>Ranked candidates</Link>
              </div>
            </div>
          ))}
        </div>
        <div className="card">
          <h2>Top Candidates</h2>
          {candidates.slice(0, 8).map((cand) => (
            <div key={cand.github_username} style={{ padding: "8px 0", borderTop: "1px solid var(--border)" }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <Link href={`/recruiter/candidates/${cand.github_username}`}>{cand.github_username}</Link>
                <strong>{cand.latest_match_score}</strong>
              </div>
              <p className="muted">Confidence {cand.confidence} • Matched {cand.matched_count} • Missing {cand.missing_count}</p>
            </div>
          ))}
        </div>
      </main>
    </AuthGuard>
  );
}
