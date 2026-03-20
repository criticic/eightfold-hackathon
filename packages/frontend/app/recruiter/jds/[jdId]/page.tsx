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
          <>
            <div className="card mb-4">
              <div className="row justify-between">
                <h1 className="m-0 text-3xl text-emerald-950">{job.title}</h1>
                <span className="badge">{job.status || "draft"}</span>
              </div>
              <p className="muted mt-2">{job.location || "Location TBD"} {job.employment_type ? `• ${job.employment_type}` : ""}</p>
              <div className="row mt-3">
                <Link href={`/recruiter/jds/${job.id}/candidates`}>View ranked candidates</Link>
              </div>
            </div>

            <div className="card mb-4">
              <h3 className="mt-0 text-2xl text-emerald-950">Detailed JD</h3>
              <pre className="m-0 whitespace-pre-wrap leading-7">{job.detailed_jd || job.jd_text}</pre>
            </div>

            {job.anonymized_jd ? (
              <div className="card">
                <h3 className="mt-0 text-2xl text-emerald-950">Public JD</h3>
                <pre className="m-0 whitespace-pre-wrap leading-7">{job.anonymized_jd}</pre>
              </div>
            ) : null}
          </>
        ) : null}
      </main>
    </AuthGuard>
  );
}
