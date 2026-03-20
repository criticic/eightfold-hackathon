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
      <div className="card" style={{ maxWidth: 500, margin: "40px auto" }}>
        <h1>Login</h1>
        <p className="muted">Access recruiter or candidate workspace.</p>
        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: 10 }}>
            <label>Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
          <div style={{ marginBottom: 10 }}>
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
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
            <button disabled={loading}>{loading ? "Signing in..." : "Login"}</button>
            <button type="button" className="secondary" onClick={() => router.push("/signup")}>Create account</button>
          </div>
        </form>
      </div>
    </main>
  );
}
