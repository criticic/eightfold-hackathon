"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth-guard";
import { TopNav } from "@/components/top-nav";
import { api } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import type { ApplicationRecord } from "@/lib/types";

export default function CandidateApplicationsPage() {
  const [rows, setRows] = useState<ApplicationRecord[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const user = getSessionUser();
    if (!user) return;
    api.myApplications(user.username)
      .then(setRows)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load applications"));
  }, []);

  return (
    <AuthGuard role="candidate">
      <main>
        <TopNav />
        <div className="card">
          <h1>My Applications</h1>
          {error ? <p style={{ color: "#8f2d1e" }}>{error}</p> : null}
          {rows.map((app) => (
            <div key={app.id} style={{ borderTop: "1px solid var(--border)", padding: "10px 0" }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong>Job #{app.job_posting_id}</strong>
                <span className="badge">{app.status}</span>
              </div>
              <p className="muted">Updated {new Date(app.updated_at).toLocaleString()}</p>
              <Link href={`/candidate/insights/${app.job_posting_id}`}>View match insight</Link>
            </div>
          ))}
        </div>
      </main>
    </AuthGuard>
  );
}
