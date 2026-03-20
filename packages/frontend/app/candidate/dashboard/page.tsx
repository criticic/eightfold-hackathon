"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth-guard";
import { TopNav } from "@/components/top-nav";
import { api } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import type { ApplicationRecord, JobPosting } from "@/lib/types";

export default function CandidateDashboardPage() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [apps, setApps] = useState<ApplicationRecord[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const user = getSessionUser();
    if (!user) return;
    Promise.all([api.candidateJobs(), api.myApplications(user.username)])
      .then(([j, a]) => {
        setJobs(j);
        setApps(a);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load dashboard"));
  }, []);

  return (
    <AuthGuard role="candidate">
      <main>
        <TopNav />
        <div className="row" style={{ marginBottom: 12 }}>
          <div className="card" style={{ flex: 1 }}>
            <h3>Published Jobs</h3>
            <p className="muted">{jobs.length} opportunities</p>
            <Link href="/candidate/jobs">Browse jobs</Link>
          </div>
          <div className="card" style={{ flex: 1 }}>
            <h3>My Applications</h3>
            <p className="muted">{apps.length} submitted</p>
            <Link href="/candidate/applications">Track status</Link>
          </div>
        </div>
        {error ? <p style={{ color: "#8f2d1e" }}>{error}</p> : null}
        <div className="card">
          <h2>Recent Jobs</h2>
          {jobs.slice(0, 8).map((job) => (
            <div key={job.id} style={{ borderTop: "1px solid var(--border)", padding: "8px 0" }}>
              <Link href={`/candidate/jobs/${job.id}`}>{job.title}</Link>
              <p className="muted">{job.location || "Location TBD"}</p>
            </div>
          ))}
        </div>
      </main>
    </AuthGuard>
  );
}
