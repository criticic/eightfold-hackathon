"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { TopNav } from "@/components/top-nav";
import { api } from "@/lib/api";

type TraceItem = {
  id: number;
  run_type: string;
  created_at: number;
  trace: Record<string, unknown>;
};

export default function RecruiterTracePage() {
  const params = useParams<{ evaluationId: string }>();
  const [trace, setTrace] = useState<TraceItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.evaluationTrace(params.evaluationId)
      .then((res) => setTrace(res.trace as TraceItem[]))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load trace"));
  }, [params.evaluationId]);

  return (
    <AuthGuard role="recruiter">
      <main>
        <TopNav />
        <div className="card">
          <h1>Evaluation Trace #{params.evaluationId}</h1>
          <p className="muted">Agent steps, files considered, and score reasoning.</p>
          {error ? <p style={{ color: "#8f2d1e" }}>{error}</p> : null}
          {trace.map((item) => (
            <div key={item.id} style={{ borderTop: "1px solid var(--border)", padding: "10px 0" }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <strong>{item.run_type}</strong>
                <span className="muted">{new Date(item.created_at).toLocaleString()}</span>
              </div>
              <pre style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>{JSON.stringify(item.trace, null, 2)}</pre>
            </div>
          ))}
        </div>
      </main>
    </AuthGuard>
  );
}
