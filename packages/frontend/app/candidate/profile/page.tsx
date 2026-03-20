"use client";

import { FormEvent, useState } from "react";
import { AuthGuard } from "@/components/auth-guard";
import { TopNav } from "@/components/top-nav";
import { api } from "@/lib/api";
import { getSessionUser } from "@/lib/session";

export default function CandidateProfilePage() {
  const [repos, setRepos] = useState("gaearon/reactjs.org");
  const [targetRole, setTargetRole] = useState("Frontend Engineer");
  const [resumeText, setResumeText] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    const user = getSessionUser();
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const report = await api.verifyCandidate({
        repos: repos.split("\n").map((item) => item.trim()).filter(Boolean),
        target_role: targetRole,
        github_username: user.username,
        resume_text: resumeText,
      });
      setResult(report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthGuard role="candidate">
      <main>
        <TopNav />
        <div className="card" style={{ marginBottom: 12 }}>
          <h1>Candidate Profile Verification</h1>
          <p className="muted">Verify your skills from repositories and resume evidence.</p>
          <form onSubmit={onVerify}>
            <div style={{ marginBottom: 10 }}>
              <label>Repositories (one per line)</label>
              <textarea rows={4} value={repos} onChange={(e) => setRepos(e.target.value)} required />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label>Target role</label>
              <input value={targetRole} onChange={(e) => setTargetRole(e.target.value)} required />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label>Resume text</label>
              <textarea rows={6} value={resumeText} onChange={(e) => setResumeText(e.target.value)} required />
            </div>
            {error ? <p style={{ color: "#8f2d1e" }}>{error}</p> : null}
            <button disabled={loading}>{loading ? "Verifying..." : "Verify profile"}</button>
          </form>
        </div>
        {result ? (
          <div className="card">
            <h2>Verification Output</h2>
            <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(result, null, 2)}</pre>
          </div>
        ) : null}
      </main>
    </AuthGuard>
  );
}
