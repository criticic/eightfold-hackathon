#set page(
  paper: "a4",
  margin: (x: 2.2cm, y: 2.2cm),
)
#set text(
  font: "Times New Roman",
  size: 11pt,
)
#set par(justify: true, leading: 0.7em)

#align(center)[
  #image("logo.png", width: 2.8cm)
  #v(8pt)
  #text(size: 16pt, weight: "bold")[RecruitOS] \
  #text(size: 16pt, weight: "bold")[An End-to-End GitHub-Verified Hiring Intelligence] \
  #v(6pt)
  #text(size: 11pt)[Abstract Submission - Eightfold AI Hackathon]
]

#v(14pt)

#table(
  columns: (auto, 1fr),
  inset: 6pt,
  stroke: none,
  [*Team Name:*], [looking_for_escorts_in_kanpur (LFEIK)],
  [*Team Techkriti ID:*], [eightfold8695],
  [*Event:*], [Eightfold AI Hackathon],
  [*Team Members:*], [
    Jayesh Puri, Sagnik Mandal, Suryansh Garg, Suyash Ranjan
  ],
)

#v(12pt)

The usual hiring stack still leans too much on keyword-heavy resumes and not enough on real technical evidence. In practice, this creates two problems: strong candidates can get filtered out for the wrong reasons, and recruiters spend time on profiles that do not match the actual work. RecruitOS is our attempt to fix that gap with an explainable, evidence-first pipeline.

Our system combines three layers. First, an agentic GitHub analysis engine reads high-signal repository files and generates role-specific job descriptions backed by code evidence. Second, a resume-matching engine verifies candidate claims against repository-level signals and computes a match score. Third, a transparent recruiter interface exposes the "why" behind every score: matched skills, missing skills, evidence files, and trace-style reasoning steps. We also provide candidate-side views so applicants can understand fit quality and improvement areas before applying.

The platform is built as a Bun monorepo with a Next.js frontend, an Elysia backend, SQLite + Drizzle for persistence and caching, and Gemini-based agents for JD synthesis and skill verification. We also built our own lightweight agentic coding agent to orchestrate repository exploration and evidence collection in a controlled loop. The backend supports recruiter flows (JD creation, ranked candidate lists, profile evaluation) and candidate flows (profile verification, job matching, application tracking), with API-first contracts to keep integration stable.

The core contribution of this project is not just scoring. It is explainable scoring. By grounding decisions in auditable repository evidence rather than opaque resume heuristics, TruthTalent improves trust for both recruiters and candidates while keeping the workflow practical enough for real hiring teams.
