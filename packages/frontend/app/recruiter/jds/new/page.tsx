"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { TopNav } from "@/components/top-nav";
import { api } from "@/lib/api";

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

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const payload = {
        repos: repos.split("\n").map((item) => item.trim()).filter(Boolean),
        rough_jd: roughJd,
        location,
        employment_type: employmentType,
        experience_level: experienceLevel,
        publish,
      };
      const created = await api.createJD(payload);
      router.push(`/recruiter/jds/${created.job_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create JD");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthGuard role="recruiter">
      <main>
        <TopNav />
        <div className="card">
          <h1>Create New Job Description</h1>
          <p className="muted">Provide repo inputs and context, then publish immediately or keep as draft.</p>
          <form onSubmit={onSubmit}>
            <div style={{ marginBottom: 10 }}>
              <label>Repositories (one per line)</label>
              <textarea rows={5} value={repos} onChange={(e) => setRepos(e.target.value)} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <label>Rough JD context</label>
              <textarea rows={4} value={roughJd} onChange={(e) => setRoughJd(e.target.value)} />
            </div>
            <div className="row">
              <div style={{ flex: 1 }}>
                <label>Location</label>
                <input value={location} onChange={(e) => setLocation(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label>Employment Type</label>
                <input value={employmentType} onChange={(e) => setEmploymentType(e.target.value)} />
              </div>
              <div style={{ flex: 1 }}>
                <label>Experience Level</label>
                <input value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)} />
              </div>
            </div>
            <div style={{ margin: "10px 0" }}>
              <label>
                <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} style={{ width: "auto", marginRight: 6 }} />
                Publish job now
              </label>
            </div>
            {error ? <p style={{ color: "#8f2d1e" }}>{error}</p> : null}
            <button disabled={loading}>{loading ? "Generating..." : "Generate JD"}</button>
          </form>
        </div>
      </main>
    </AuthGuard>
  );
}
