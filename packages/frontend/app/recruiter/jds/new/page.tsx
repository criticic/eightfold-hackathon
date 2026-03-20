"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { TopNav } from "@/components/top-nav";
import { api } from "@/lib/api";

type JDRun = Awaited<ReturnType<typeof api.jdGenerationRun>>;

function formatElapsed(startedAt: number) {
  const totalSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export default function RecruiterCreateJDPage() {
  const router = useRouter();
  const [repos, setRepos] = useState("vercel/next.js\nvercel/turbo");
  const [roughJd, setRoughJd] = useState("Frontend platform engineer for build systems and DX tooling");
  const [location, setLocation] = useState("Remote");
  const [employmentType, setEmploymentType] = useState("Full-time");
  const [experienceLevel, setExperienceLevel] = useState("Senior");
  const [publish, setPublish] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [runId, setRunId] = useState("");
  const [run, setRun] = useState<JDRun | null>(null);
  const [elapsed, setElapsed] = useState("0:00");

  useEffect(() => {
    if (!runId) return;

    let active = true;
    let pollId = 0;

    const refreshRun = async () => {
      try {
        const current = await api.jdGenerationRun(runId);
        if (!active) return;
        setRun(current);
        setElapsed(formatElapsed(current.created_at));
        if (current.status === "done" || current.status === "error") {
          setLoading(false);
          window.clearInterval(pollId);
        }
      } catch (err) {
        if (!active) return;
        setLoading(false);
        setError(err instanceof Error ? err.message : "Failed to refresh JD generation state");
      }
    };

    void refreshRun();
    pollId = window.setInterval(() => {
      void refreshRun();
    }, 1200);

    return () => {
      active = false;
      window.clearInterval(pollId);
    };
  }, [runId]);

  useEffect(() => {
    if (!run || run.status === "done" || run.status === "error") return;
    const timerId = window.setInterval(() => setElapsed(formatElapsed(run.created_at)), 1000);
    return () => window.clearInterval(timerId);
  }, [run]);

  const completion = useMemo(() => {
    if (!run) return 0;
    const done = run.steps.filter((step) => step.state === "done").length;
    return Math.round((done / Math.max(1, run.steps.length)) * 100);
  }, [run]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setRun(null);
    setRunId("");
    try {
      const payload = {
        repos: repos.split("\n").map((item) => item.trim()).filter(Boolean),
        rough_jd: roughJd,
        location,
        employment_type: employmentType,
        experience_level: experienceLevel,
        publish,
      };
      const started = await api.startJDGeneration(payload);
      setRunId(started.run_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create JD");
      setLoading(false);
    }
  }

  return (
    <AuthGuard role="recruiter">
      <main>
        <TopNav />
        <div className="card">
          <h1 className="mb-1 text-3xl text-emerald-950">Create New Job Description</h1>
          <p className="muted mb-5">Provide repo inputs and context, then publish immediately or keep as draft.</p>
          <form onSubmit={onSubmit}>
            <div className="mb-3">
              <label>Repositories (one per line)</label>
              <textarea rows={5} value={repos} onChange={(e) => setRepos(e.target.value)} />
            </div>
            <div className="mb-3">
              <label>Rough JD context</label>
              <textarea rows={4} value={roughJd} onChange={(e) => setRoughJd(e.target.value)} />
            </div>
            <div className="row">
              <div className="flex-1">
                <label>Location</label>
                <input value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
              <div className="flex-1">
                <label>Employment Type</label>
                <input value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} />
              </div>
              <div className="flex-1">
                <label>Experience Level</label>
                <input value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)} />
              </div>
            </div>
            <div className="my-3">
              <label className="inline-flex items-center gap-2">
                <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} className="w-auto" />
                Publish job now
              </label>
            </div>
            {error ? <p className="mb-3 text-sm font-semibold text-red-800">{error}</p> : null}
            <button disabled={loading}>{loading ? "Generating with live trace..." : "Generate JD"}</button>
          </form>
        </div>

        {run ? (
          <div className="card mt-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="m-0 text-2xl text-emerald-950">Live generation trace</h2>
              <span className="badge">{run.status}</span>
            </div>
            <p className="muted mb-2 text-sm">Elapsed {elapsed}</p>
            <div className="mb-4 h-2 overflow-hidden rounded-full bg-emerald-100">
              <div className="h-full bg-emerald-700 transition-all duration-500" style={{ width: `${completion}%` }} />
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
                  <p
                    key={`${event.at}-${idx}`}
                    className={`m-0 text-sm ${event.level === "error" ? "text-red-800" : "text-emerald-950/80"}`}
                  >
                    [{new Date(event.at).toLocaleTimeString()}] {event.message}
                  </p>
                ))}
              </div>
            </div>

            {run.error ? <p className="mt-4 text-sm font-semibold text-red-800">{run.error}</p> : null}

            {run.status === "done" && typeof run.result?.job_id === "number" ? (
              <div className="mt-4 row">
                <button onClick={() => router.push(`/recruiter/jds/${run.result?.job_id}`)}>Open generated JD</button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setRun(null);
                    setRunId("");
                    setLoading(false);
                  }}
                >
                  Create another JD
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </main>
    </AuthGuard>
  );
}
