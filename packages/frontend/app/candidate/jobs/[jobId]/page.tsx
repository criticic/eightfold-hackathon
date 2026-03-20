"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { TopNav } from "@/components/top-nav";
import { api } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import type { JobPosting } from "@/lib/types";

export default function CandidateJobDetailPage() {
  const params = useParams<{ jobId: string }>();
  const router = useRouter();
  const [job, setJob] = useState<JobPosting | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.candidateJob(params.jobId)
      .then(setJob)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load job"));
  }, [params.jobId]);

  async function onApply(e: FormEvent) {
    e.preventDefault();
    if (!job) return;
    const user = getSessionUser();
    if (!user) return;

    setSubmitting(true);
    setError("");
    try {
      await api.applyToJob({
        job_id: job.id,
        candidate_username: user.username,
        notes,
      });
      router.push("/candidate/applications");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Apply failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthGuard role="candidate">
      <main>
        <TopNav />
        {error ? <p style={{ color: "#8f2d1e" }}>{error}</p> : null}
        {!job ? <p className="muted">Loading...</p> : null}
        {job ? (
          <>
            <div className="card" style={{ marginBottom: 12 }}>
              <h1>{job.title}</h1>
              <p className="muted">{job.location || "Location TBD"} {job.employment_type ? `• ${job.employment_type}` : ""}</p>
              <pre style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{job.jd_text}</pre>
            </div>
            <div className="card">
              <h2>Apply</h2>
              <form onSubmit={onApply}>
                <label>Optional note</label>
                <textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
                <button disabled={submitting}>{submitting ? "Submitting..." : "Submit application"}</button>
              </form>
            </div>
          </>
        ) : null}
      </main>
    </AuthGuard>
  );
}
