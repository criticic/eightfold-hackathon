"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { TopNav } from "@/components/top-nav";
import { api } from "@/lib/api";
import type { JobPosting } from "@/lib/types";

export default function RecruiterJDDetailPage() {
  const params = useParams<{ jdId: string }>();
  const [job, setJob] = useState<JobPosting | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.recruiterJob(params.jdId)
      .then(setJob)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load job"));
  }, [params.jdId]);

  return (
    <AuthGuard role="recruiter">
      <main>
        <TopNav />
        {error ? <p style={{ color: "#8f2d1e" }}>{error}</p> : null}
        {!job ? <p className="muted">Loading...</p> : null}
        {job ? (
          <div className="card">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <h1>{job.title}</h1>
              <span className="badge">{job.status || "draft"}</span>
            </div>
            <p className="muted">{job.location || "Location TBD"} {job.employment_type ? `• ${job.employment_type}` : ""}</p>
            <h3>Detailed JD</h3>
            <pre style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{job.detailed_jd || job.jd_text}</pre>
            {job.anonymized_jd ? (
              <>
                <h3>Public JD</h3>
                <pre style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{job.anonymized_jd}</pre>
              </>
            ) : null}
            <div className="row">
              <Link href={`/recruiter/jds/${job.id}/candidates`}>View ranked candidates</Link>
            </div>
          </div>
        ) : null}
      </main>
    </AuthGuard>
  );
}
