"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { setSessionUser } from "@/lib/session";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"candidate" | "recruiter">("candidate");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const user = await api.login({ username, password, role });
      setSessionUser({
        id: user.id,
        username: user.username,
        role: user.role as "candidate" | "recruiter",
        created_at: user.created_at,
      });
      router.push(user.role === "recruiter" ? "/recruiter/dashboard" : "/candidate/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <div className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-[1.2fr_1fr]">
        <section className="card relative overflow-hidden">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-200/45 blur-2xl" />
          <h1 className="mb-2 text-4xl text-emerald-950">A calmer way to hire with evidence</h1>
          <p className="max-w-md text-emerald-950/75">
            RecruitOS helps teams screen fairly, trace model decisions, and focus on skill signal.
          </p>
          <div className="mt-6 space-y-3 text-sm text-emerald-950/80">
            <p>Independent confidence scoring for every recommendation.</p>
            <p>Structured traces so recruiters can audit each result.</p>
            <p>Candidate-side insights that explain match quality clearly.</p>
          </div>
        </section>
        <div className="card">
          <h1 className="mb-1 text-3xl text-emerald-950">Login</h1>
          <p className="muted mb-5">Access recruiter or candidate workspace.</p>
          <form onSubmit={onSubmit}>
            <div className="mb-3">
              <label>Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div className="mb-3">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="mb-4">
              <label>Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value as "candidate" | "recruiter") }>
                <option value="candidate">Candidate</option>
                <option value="recruiter">Recruiter</option>
              </select>
            </div>
            {error ? <p className="mb-3 text-sm font-semibold text-red-800">{error}</p> : null}
            <div className="row">
              <button disabled={loading}>{loading ? "Signing in..." : "Login"}</button>
              <button type="button" className="secondary" onClick={() => router.push("/signup")}>Create account</button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
