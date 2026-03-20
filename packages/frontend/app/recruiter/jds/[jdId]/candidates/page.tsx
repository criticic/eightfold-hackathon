"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [githubUsername, setGithubUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastDetected, setLastDetected] = useState<{ username?: string; repos: string[] } | null>(null);
  const [runId, setRunId] = useState("");
  const [run, setRun] = useState<Awaited<ReturnType<typeof api.evaluateCandidateResumeRun>> | null>(null);
  const [elapsed, setElapsed] = useState("0:00");

  const progress = useMemo(() => {
    if (!run) return 0;
    const done = run.steps.filter((step) => step.state === "done").length;
    return Math.round((done / Math.max(1, run.steps.length)) * 100);
  }, [run]);

  useEffect(() => {
    if (!runId) return;
    let active = true;
    let pollId = 0;

    const refresh = async () => {
      try {
        const current = await api.evaluateCandidateResumeRun(runId);
        if (!active) return;
        setRun(current);
        const seconds = Math.max(0, Math.floor((Date.now() - current.created_at) / 1000));
        setElapsed(`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`);

        if (current.status === "done" || current.status === "error") {
          setLoading(false);
          window.clearInterval(pollId);
          if (current.status === "done") {
            const detected = current.result?.detected;
            setLastDetected({
              username: detected?.github_username,
              repos: detected?.repositories || [],
            });
            await load();
          }
        }
      } catch (err) {
        if (!active) return;
        setLoading(false);
        setError(err instanceof Error ? err.message : "Failed to refresh evaluation run");
      }
    };

    void refresh();
    pollId = window.setInterval(() => {
      void refresh();
    }, 1200);

    return () => {
      active = false;
      window.clearInterval(pollId);
    };
  }, [runId]);

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
    if (!job || !resumeFile) return;
    setLoading(true);
    setError("");
    try {
      setRun(null);
      setRunId("");
      const started = await api.startEvaluateCandidateResume(Number(params.jdId), resumeFile, githubUsername);
      setRunId(started.run_id);
      setResumeFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Evaluation failed");
      setLoading(false);
    }
  }

  return (
    <AuthGuard role="recruiter">
      <main>
        <TopNav />
        <div className="card" style={{ marginBottom: 12 }}>
          <h1>Ranked Candidates</h1>
          <p className="muted">Provide GitHub username + resume PDF. We parse resume context, load repos via GitHub, then evaluate against this JD.</p>
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
          <h2>Evaluate Candidate from Resume PDF</h2>
          <form onSubmit={onEvaluate}>
            <div className="mb-3">
              <label>GitHub Username</label>
              <input
                value={githubUsername}
                onChange={(e) => setGithubUsername(e.target.value)}
                placeholder="e.g. torvalds"
                required
              />
            </div>
            <div className="mb-3">
              <label>Resume PDF</label>
              <input
                type="file"
                accept="application/pdf"
                required
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setResumeFile(file);
                }}
              />
            </div>
            {lastDetected ? (
              <p className="muted mb-2 text-sm">
                Last detected profile: <strong>{lastDetected.username || "unknown"}</strong> with {lastDetected.repos.length} repos.
              </p>
            ) : null}
            {error ? <p className="mb-2 text-sm font-semibold text-red-800">{error}</p> : null}
            <button disabled={loading || !resumeFile || !githubUsername.trim()}>{loading ? "Evaluating from resume..." : "Evaluate candidate"}</button>
          </form>
        </div>

        {run ? (
          <div className="card mt-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="m-0 text-2xl text-emerald-950">Live evaluation trace</h2>
              <span className="badge">{run.status}</span>
            </div>
            <p className="muted mb-2 text-sm">Elapsed {elapsed}</p>
            <div className="mb-4 h-2 overflow-hidden rounded-full bg-emerald-100">
              <div className="h-full bg-emerald-700 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <div className="space-y-2">
              {run.steps.map((step) => (
                <div key={step.id} className="rounded-xl border border-emerald-200/70 bg-white/70 px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-emerald-950">{step.label}</strong>
                    <span className="text-xs font-semibold uppercase tracking-wide text-emerald-800/80">{step.state}</span>
                  </div>
                  <p className="muted mt-1 text-sm">{step.detail}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-emerald-200/70 bg-white/70 p-3">
              <h3 className="m-0 mb-2 text-lg text-emerald-950">Agent output log</h3>
              <div className="max-h-56 space-y-1 overflow-auto pr-1">
                {[...run.events].reverse().map((event, idx) => (
                  <p key={`${event.at}-${idx}`} className={`m-0 text-sm ${event.level === "error" ? "text-red-800" : "text-emerald-950/80"}`}>
                    [{new Date(event.at).toLocaleTimeString()}] {event.message}
                  </p>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </AuthGuard>
  );
}
