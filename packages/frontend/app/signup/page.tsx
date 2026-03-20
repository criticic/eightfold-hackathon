"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function SignupPage() {
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
      await api.signup({ username, password, role });
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <div className="card" style={{ maxWidth: 500, margin: "40px auto" }}>
        <h1>Create account</h1>
        <p className="muted">Set up candidate or recruiter access.</p>
        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: 10 }}>
            <label>Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} minLength={3} required />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label>Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as "candidate" | "recruiter") }>
              <option value="candidate">Candidate</option>
              <option value="recruiter">Recruiter</option>
            </select>
          </div>
          {error ? <p style={{ color: "#8f2d1e" }}>{error}</p> : null}
          <div className="row">
            <button disabled={loading}>{loading ? "Creating..." : "Create account"}</button>
            <button type="button" className="secondary" onClick={() => router.push("/login")}>Back to login</button>
          </div>
        </form>
      </div>
    </main>
  );
}
