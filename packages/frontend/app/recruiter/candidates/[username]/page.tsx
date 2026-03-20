"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AuthGuard } from "@/components/auth-guard";
import { TopNav } from "@/components/top-nav";
import { api } from "@/lib/api";
import type { EvaluationDetail } from "@/lib/types";

export default function RecruiterCandidateDetailPage() {
  const params = useParams<{ username: string }>();
  const [evaluations, setEvaluations] = useState<EvaluationDetail[]>([]);
  const [best, setBest] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    api.recruiterCandidate(params.username)
      .then((data) => {
        setEvaluations(data.evaluations);
        setBest(data.best_match_score);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load candidate"));
  }, [params.username]);

  return (
    <AuthGuard role="recruiter">
      <main>
        <TopNav />
        <div className="card" style={{ marginBottom: 12 }}>
          <h1>{params.username}</h1>
          <p className="muted">Best match score: {best}</p>
          {error ? <p style={{ color: "#8f2d1e" }}>{error}</p> : null}
        </div>
        {evaluations.map((ev) => (
          <div key={ev.id} className="card" style={{ marginBottom: 12 }}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <strong>Evaluation #{ev.id}</strong>
              <span className="badge">Score {ev.match_score}</span>
            </div>
            <p className="muted">Confidence {ev.confidence} • Matched {ev.matched_count} • Missing {ev.missing_count}</p>
            <p>{ev.reasoning}</p>
            <div className="row">
              <Link href={`/recruiter/trace/${ev.id}`}>View full trace</Link>
            </div>
          </div>
        ))}
      </main>
    </AuthGuard>
  );
}
