"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth-guard";
import { TopNav } from "@/components/top-nav";
import { api } from "@/lib/api";
import type { JobPosting } from "@/lib/types";

export default function CandidateJobsPage() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api.candidateJobs()
      .then(setJobs)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load jobs"));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((job) => `${job.title} ${job.location || ""}`.toLowerCase().includes(q));
  }, [jobs, query]);

  return (
    <AuthGuard role="candidate">
      <main>
        <TopNav />
        <div className="card">
          <h1>Jobs</h1>
          <input placeholder="Search by title or location" value={query} onChange={(e) => setQuery(e.target.value)} />
          {error ? <p style={{ color: "#8f2d1e" }}>{error}</p> : null}
          {filtered.map((job) => (
            <div key={job.id} style={{ borderTop: "1px solid var(--border)", padding: "10px 0" }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <Link href={`/candidate/jobs/${job.id}`}>{job.title}</Link>
                <span className="badge">{job.experience_level || "Any"}</span>
              </div>
              <p className="muted">{job.location || "Location TBD"} {job.employment_type ? `• ${job.employment_type}` : ""}</p>
            </div>
          ))}
        </div>
      </main>
    </AuthGuard>
  );
}
