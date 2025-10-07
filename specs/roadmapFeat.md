# Lurnix — Objectives + Roadmaps (AI-integrated)

This document specifies a portfolio-first, sprint-based learning system with flexible durations (3/7/14 days), multi-objective management with priorities, and collaborative completion evaluation. It also details AI integration for Phase 1 (LM Studio, local) and Phase 2 (Groq, MVP prod; Llama 3.1 70B).

---

## 0) Product Principles

* **Portfolio-first**: every sprint leads to visible artifacts (repo, deployment, demo).
* **Rolling sprints**: generate a new sprint at the end of the current one until the objective is achieved.
* **Flexible durations**: 3 / 7 / 14-day sprints chosen by AI based on objective complexity & user availability.
* **Multi-objective, single-focus**: multiple active objectives allowed per plan tier; one focus objective in UI with priorities.
* **Collaborative evaluation**: auto-eval guided by IA + rubric + tests + portfolio evidence.
* **Paywall moments**: Free = 1 objective + 1 sprint; Builder/Master = multiple objectives + unlimited sprints; human mentoring in Master.

---

## 1) User Journeys (personas)

### A) Complete Beginner → Web Dev

1. Create objective → “Devenir dev web junior” (+ passions, weekly hours).
2. Estimation global: 8–12 semaines. Sprint 1 (7j) proposé.
3. Deliverable Sprint 1: Landing page déployée (Netlify).
4. Sprint 2 (7–14j): mini-app catalogue vanilla JS → déployée.
5. Rolls sprints until portfolio (2–3 apps) + basic CS understanding; objective evaluated; next objective suggested.

### B) Junior Dev → Data Structures Mastery

1. Objective: “Maitriser les DS en JS/TS”. Estimation: 2–4 semaines.
2. Sprint 1 (3j): révision bases + tests.
3. Sprint 2 (7j): implémenter stack/queue/tree + CI.
4. Evidence: repo + suite tests + bench léger; evaluation → recommandations.

### C) Confirmed Dev → Passion Projects

1. Objective: “Projet IA playlists musique”. Estimation: 2–6 semaines.
2. Sprint 1 (7j): MVP API + front minimal;
3. Sprint 2 (14j): raffinements, UX, déploiement stable + Loom demo.

### D) Hobbyist → Build a Game Prototype

1. Objective: “Prototype 2D jouable”. Estimation: 2–4 semaines.
2. Sprint 1 (14j): gameplay minimal + build Itch.io.
3. Sprint 2 (7j): polish + score + partage.

---

## 2) Data Contracts (Frontend-facing JSON)

> **Goal**: UI-ready, portfolio-first, sprintable. (No SQL here.)

### 2.1 Objective (UI)

```json
{
  "id": "obj_123",
  "title": "Devenir dev web junior",
  "description": "Parcours orienté projets, 2–3 apps déployées",
  "passionTags": ["musique", "design"],
  "priority": 1,
  "status": "active",
  "estimatedTotalWeeks": {"min": 8, "max": 12},
  "successCriteria": [
    "2 projets déployés",
    "README de qualité",
    "1 mini-entretien simulé"
  ],
  "requiredSkills": ["HTML", "CSS", "JS"],
  "currentSprintId": "spr_001",
  "progress": {"sprintsDone": 1, "sprintsPlanned": 10, "percent": 12}
}
```

### 2.2 Sprint (UI)

```json
{
  "id": "spr_001",
  "objectiveId": "obj_123",
  "title": "Sprint 1 — Landing page déployée",
  "description": "Créer et déployer une page perso responsive.",
  "lengthDays": 7,
  "difficulty": "beginner",
  "totalEstimatedHours": 6,
  "projects": [
    {
      "id": "prj_001",
      "title": "Landing page perso",
      "brief": "Sections: header, à propos, projets, contact. Responsive.",
      "requirements": ["Responsive", "Accessibilité basique", "README"],
      "acceptanceCriteria": ["URL déployée", "3 captures"],
      "deliverables": [
        {"type": "repository", "title": "Repo", "artifactId": "art_repo_1"},
        {"type": "deployment", "title": "Demo", "artifactId": "art_deploy_1"}
      ],
      "evidenceRubric": {
        "dimensions": [
          {"name": "Fonctionnalité", "weight": 0.4},
          {"name": "Qualité code", "weight": 0.3},
          {"name": "UX", "weight": 0.2},
          {"name": "Documentation", "weight": 0.1}
        ],
        "passThreshold": 0.7
      }
    }
  ],
  "microTasks": [
    {
      "id": "tsk_001",
      "projectId": "prj_001",
      "title": "Init repo + boilerplate",
      "type": "build",
      "estimatedMinutes": 30,
      "instructions": "Créer repo, init README, push initial",
      "acceptanceTest": {"type": "checklist", "spec": ["Repo créé", "README"]}
    }
  ],
  "portfolioCards": [
    {"projectId": "prj_001", "headline": "Landing déployée", "links": {"repo": "...", "demo": "..."}}
  ],
  "adaptationNotes": "Si blocage CSS, insérer microTask layout.",
  "progress": {"completedTasks": 2, "completedDays": 1, "scoreEstimate": 0.5}
}
```

---

## 3) AI Integration — Architecture

### 3.1 Agents & Responsibilities

* **Planner** (function-call, JSON strict, temp 0.2): generates sprint plan (3/7/14) based on objective, profile, and last sprint results.
* **Coach** (chat, temp 0.6–0.8): helps during sprint; hints ladder; reflection prompts.
* **Reviewer** (function-call, JSON strict, temp 0.2): evaluates deliverables via rubric + tests/links; produces remediation tasks.
* **Router/RAG**: retrieves allowed resources (short, curated) to ground explanations.

### 3.2 Providers & Environments

* **Phase 1 (Dev, now)**: LM Studio on Mac M3

  * Serve local endpoint (OpenAI-compatible) → `http://localhost:1234/v1/chat/completions`
  * Model suggestion: Llama 3.1 8B/13B (fast local), or distilled 70B via quant if feasible.
* **Phase 2 (MVP Prod)**: Groq API (0€)

  * Switch base URL (env var) → `GROQ_API_BASE` + `GROQ_API_KEY`.
  * Model: **Llama 3.1 70B** (groq: `llama-3.1-70b` variant; check exact ID in Groq docs).

### 3.3 Safety & Determinism

* Use tool-calls / function schemas + Zod validation on responses.
* Retry with lower temperature or structured prompting on schema failure.
* Log tokens, latency, `model`, `provider`, `generation_time_seconds`.

---

## 4) Prompts & Schemas (concise, ready-to-ship)

### 4.1 Planner — System Prompt (summary)

> You are **Lurnix Planner**. Produce a 3/7/14-day sprint plan as strict JSON matching the schema. Tasks must be 30–90 minutes and end with a check (quiz, tests, or deliverable). Prefer projects over theory. Respect availability, language, and passions. If prerequisites are missing, insert prerequisite microTasks. Only use resources from `allowed_resources`.

**Function/Tool Schema (TypeScript flavor):**

```ts
interface GenerateSprintInput {
  objective: ObjectiveInput;      // title, passions, successCriteria, estimation, priority
  profile: ProfileInput;          // language, hours/week, prefs
  lastSprint?: SprintResultInput; // completionRate, blockers, mastered, artifacts
  preferLength?: 3|7|14;
}

interface SprintPlan {
  id: string;
  lengthDays: 3|7|14;
  title: string;
  description: string;
  projects: Project[];
  microTasks: MicroTask[];
  portfolioCards: PortfolioCard[];
  adaptationNotes: string;
}
```

### 4.2 Reviewer — System Prompt (summary)

> You are **Lurnix Reviewer**. Evaluate submitted evidence using the rubric. Prefer objective signals (tests passing, live demo reachable) over self-report. Output JSON with `score`, `achieved`, `missing`, and `nextRecommendations`.

**Function/Tool Schema (output):**

```ts
interface ReviewOutput {
  score: number; // 0..1
  achieved: string[];
  missing: string[];
  nextRecommendations: string[]; // micro-remediations or next sprint focus
}
```

### 4.3 Coach — Guardrails

* Hint ladder: gentle → scaffold → worked example (after 2 échecs).
* Mood check after task. Short reflection prompt every 2–3 tasks.

---

## 5) Backend Services (No SQL; responsibilities only)

* **ObjectivesService**: create objective (capture passions), compute estimation (weeks range), store success criteria, required skills; manage priority & focus.
* **SprintsService**: generate sprint (Planner), update progress, complete sprint → trigger Reviewer → suggest next sprint.
* **EvidenceService**: store artifacts (repo, demo, screenshots, videos), run basic checks (HTTP reachability, CI badge), attach to sprint.
* **EvaluationService**: orchestrate reviewer output + self-eval; decide objective completion; suggest next objective.
* **PlanLimitationService**: enforce plan caps (objectives count; sprints per objective for Free; unlimited for Builder/Master). Paywall strings.
* **AIProvider**: abstraction over LM Studio vs Groq; same function signatures; switch via env.

---

## 6) API (high-level, RESTish)

* `POST /objectives` → returns objective + estimation + canGenerateSprint (limits).
* `POST /objectives/:id/sprints/generate` → returns sprint JSON.
* `PUT /sprints/:id/progress` → mark tasks/day complete; notes; minutes.
* `PUT /sprints/:id/complete` → trigger review; returns score + next-sprint suggestion (+ paywall if Free used).
* `POST /objectives/:id/evaluate-completion` → final review w/ portfolio summary.
* `GET /ai/config` → provider, env, model.

---

## 7) Frontend (React) — Component Map

* **ObjectivePage**

  * Header: title + estimatedTotalWeeks + progress bar (sprintsDone / planned)
  * Tabs: *Active Sprint*, *Portfolio*, *Evidence*, *Settings*
  * CTA: “Générer sprint suivant” (gated by plan)
* **SprintBoard**

  * Day columns = lengthDays (3/7/14)
  * ProjectCard (deliverables + rubric preview)
  * MicroTaskList with **One Next Action** CTA
  * Reflection mini-modal
* **PortfolioWall**

  * Renders `portfolioCards` across sprints, shareable links

---

## 8) Phase Plan & Dev Tasks

### Phase 1 — Dev (LM Studio, local)

1. **Provider Abstraction**: create `AiClient` interface (planner/coach/reviewer).
2. **Zod Schemas** for Planner/Reviewer I/O; implement retry/backoff.
3. **ObjectivesService** MVP with estimation (simple rule-based + LLM fallback).
4. **Sprint generation** end-to-end (POST generate → render UI → progress → complete → review → suggest next).
5. **Local runs** against LM Studio; measure latency & token usage.

### Phase 2 — MVP Production (Groq)

1. Swap base URL + API key; select `llama-3.1-70b`.
2. Rate limits handling (6k tok/min): shared throttle; queue per user.
3. Observability: logs (prompt hash), tracing, failure analytics.
4. Basic abuse/safety filters (max external URLs; resource allowlist).
5. Ship onboarding, one objective, one sprint free → upgrade flows.

---

## 9) Metrics & Success Criteria

* TtFW < 2 sessions; Sprint completion ≥ 60%.
* % with deployed artifact ≥ 70% (Free), ≥ 80% (paid).
* Upgrade CVR from Free → Builder ≥ 8%.
* Reviewer agreement (human vs IA) ≥ 0.8.

---

## 10) Risks & Mitigations

* **Schema drift / JSON invalid** → Zod + auto-retry + sentinel examples.
* **Hallucinations ressource** → allowlist only; no free-form links.
* **Under/over estimation** → display range + recalc after chaque sprint.
* **Token costs/latency** (prod) → Groq 70B; cache by objective; truncate history with state snapshots.

---

## 11) Next Deliverables

* Planner & Reviewer prompts (full), Zod schemas.
* React mockups: ObjectivePage, SprintBoard, PortfolioWall.
* Provider adapter: LM Studio ↔ Groq.

---

## 12) Full Prompts — Planner & Reviewer (ready to paste)

### 12.1 Planner — System Prompt (verbatim)

```
You are **Lurnix Planner**, an expert at generating short, portfolio-first learning sprints. 
Your job: given (a) the learner profile, (b) the active objective, and (c) the latest progress, 
produce a **3/7/14-day sprint** that ends in tangible **deliverables** (repo, deployment, demo) and 
that is safe, scoped, and motivating.

### Rules (non-negotiable)
1) **Portfolio-first**: at least one project with visible deliverables and acceptance criteria.
2) **Keep it short**: microTasks of **30–90 minutes** each; avoid generic theory without purpose.
3) **Evidence-based**: every microTask ends with a small check (checklist, unit tests, demo, or quiz).
4) **Grounded**: only use resources from `allowed_resources` provided by the system.
5) **Respect context**: language, passions, device limits, hours/week, and blockers.
6) **Safety**: no unsafe content, no scraping, no private data requests.
7) **Output format**: return **STRICT JSON** exactly matching the provided schema. No extra text.

### Inputs you will receive
- `objective`: title, passions, successCriteria, estimatedWeeksRange, priority.
- `profile`: language, hoursPerWeek, learningPrefs, device, confidence by topic.
- `lastSprint` (optional): completionRate, blockers, masteredTopics, artifacts, reviewerNotes.
- `preferLength` (optional): 3 | 7 | 14.
- `allowed_resources`: curated list of resource IDs you may reference.

### Planning guidance
- Choose `lengthDays` from {3,7,14} based on complexity, time budget, and recent progress.
- Prefer **one main project** per sprint; for 14 days, you may add a small stretch goal.
- Write **adaptationNotes** explaining any prerequisite insertions or scope trims/expansions.
- Use passions to theme project briefs (e.g., music playlists, sports stats) when helpful.
- Calibrate scope to fit hours/week. If hours/week are very low, prefer smaller `lengthDays`.
- If the learner failed key topics last sprint, insert prerequisite microTasks early.

### Output JSON schema
Return JSON **strictly matching** the `SprintPlan` schema below.
```

### 12.1.1 Planner — Function Schema (TypeScript + Zod)

```ts
// Input to Planner
type GenerateSprintInput = {
  objective: {
    id: string
    title: string
    passionTags: string[]
    successCriteria: string[]
    estimatedTotalWeeks?: { min: number; max: number }
    priority: 1 | 2 | 3
  }
  profile: {
    language: 'FR' | 'EN'
    hoursPerWeek: number
    learningPrefs?: { format?: ('text'|'video'|'coach')[]; sessionLength?: '20-30'|'30-45'|'60-90' }
    device?: 'mobile'|'laptop'|'desktop'
    confidence?: Record<string, number> // 0..1 per topic
  }
  lastSprint?: {
    completionRate: number // 0..1
    blockers?: string[]
    masteredTopics?: string[]
    artifacts?: { type: 'repo'|'deployment'|'video'|'screenshot'; url?: string; note?: string }[]
    reviewerNotes?: string
  }
  preferLength?: 3 | 7 | 14
  allowed_resources: { id: string; title: string; type: 'article'|'video'|'documentation'|'tool'; url: string; difficulty: 'beginner'|'intermediate'|'advanced' }[]
}

// Output from Planner
export type SprintPlan = {
  id: string
  lengthDays: 3 | 7 | 14
  title: string
  description: string
  difficulty: 'beginner'|'intermediate'|'advanced'
  totalEstimatedHours: number
  projects: {
    id: string
    title: string
    brief: string
    requirements: string[]
    acceptanceCriteria: string[]
    deliverables: { type: 'repository'|'deployment'|'video'|'screenshot'; title: string; artifactId: string }[]
    evidenceRubric: {
      dimensions: { name: string; weight: number; levels?: string[] }[] // weights sum ~1.0
      passThreshold: number // 0..1
    }
    checkpoints?: { id: string; title: string; type: 'assessment'|'quiz'|'demo'; spec: string }[]
    support?: {
      concepts?: { id: string; title: string; summary: string }[]
      practiceKatas?: { id: string; title: string; estimateMin: number }[]
      allowedResources?: string[] // ids from allowed_resources
    }
    reflection?: { prompt: string; moodCheck?: boolean }
  }[]
  microTasks: {
    id: string
    projectId: string
    title: string
    type: 'concept'|'practice'|'project'|'assessment'|'reflection'
    estimatedMinutes: number
    instructions: string
    acceptanceTest: { type: 'checklist'|'unit_tests'|'quiz'|'demo'; spec: string | string[] }
    resources?: string[] // ids from allowed_resources
  }[]
  portfolioCards: {
    projectId: string
    cover?: string
    headline: string
    badges?: string[]
    links?: { repo?: string; demo?: string; video?: string }
  }[]
  adaptationNotes: string
}
```

```ts
// Zod validators (excerpt)
import { z } from 'zod'

export const zSprintPlan = z.object({
  id: z.string(),
  lengthDays: z.union([z.literal(3), z.literal(7), z.literal(14)]),
  title: z.string().min(3),
  description: z.string().min(10),
  difficulty: z.enum(['beginner','intermediate','advanced']),
  totalEstimatedHours: z.number().min(1),
  projects: z.array(z.object({
    id: z.string(),
    title: z.string(),
    brief: z.string(),
    requirements: z.array(z.string()).min(1),
    acceptanceCriteria: z.array(z.string()).min(1),
    deliverables: z.array(z.object({
      type: z.enum(['repository','deployment','video','screenshot']),
      title: z.string(),
      artifactId: z.string()
    })).min(1),
    evidenceRubric: z.object({
      dimensions: z.array(z.object({ name: z.string(), weight: z.number().min(0).max(1), levels: z.array(z.string()).optional() })),
      passThreshold: z.number().min(0).max(1)
    }),
    checkpoints: z.array(z.object({ id: z.string(), title: z.string(), type: z.enum(['assessment','quiz','demo']), spec: z.string() })).optional(),
    support: z.object({
      concepts: z.array(z.object({ id: z.string(), title: z.string(), summary: z.string() })).optional(),
      practiceKatas: z.array(z.object({ id: z.string(), title: z.string(), estimateMin: z.number().min(5) })).optional(),
      allowedResources: z.array(z.string()).optional()
    }).optional(),
    reflection: z.object({ prompt: z.string(), moodCheck: z.boolean().optional() }).optional()
  })).min(1),
  microTasks: z.array(z.object({
    id: z.string(),
    projectId: z.string(),
    title: z.string(),
    type: z.enum(['concept','practice','project','assessment','reflection']),
    estimatedMinutes: z.number().min(15).max(120),
    instructions: z.string(),
    acceptanceTest: z.object({ type: z.enum(['checklist','unit_tests','quiz','demo']), spec: z.union([z.string(), z.array(z.string()).min(1)]) }),
    resources: z.array(z.string()).optional()
  })).min(3),
  portfolioCards: z.array(z.object({
    projectId: z.string(),
    cover: z.string().url().optional(),
    headline: z.string(),
    badges: z.array(z.string()).optional(),
    links: z.object({ repo: z.string().url().optional(), demo: z.string().url().optional(), video: z.string().url().optional() }).optional()
  })).optional(),
  adaptationNotes: z.string().min(5)
})
```

### 12.1.2 Planner — Few-shot Hints (inline examples the model can see)

```
Example A (beginner, 7 days, music passion):
- Project: "Catalogue d'albums" (React) → deliverables: repo + demo; acceptance: recherche live, 3 captures.
- MicroTasks: init repo, liste statique, input contrôle, filtre, déploiement, README.

Example B (DS focus, 7 days):
- Project: "Librairie structures" → deliverables: repo + CI badge green; acceptance: tests unitaires OK.
- MicroTasks: stack, queue, tree, tests, README benchmark.
```

---

### 12.2 Reviewer — System Prompt (verbatim)

```
You are **Lurnix Reviewer**, an objective evaluator of learning evidence.
Your job: assess whether the sprint's **deliverables** meet the rubric and acceptance criteria, 
produce a numeric score (0..1), list achieved vs missing items, and propose **next recommendations**.

### Rules
1) **Evidence-first**: prioritize objective signals (tests passing, live demo reachable, repo structure) over self-report.
2) **Rubric-driven**: use the provided weights to compute a score; do not invent dimensions.
3) **Honest but motivating**: short, specific recommendations; prefer micro-remediation.
4) **Safety**: never request private credentials; do not execute untrusted code.
5) **Output format**: return STRICT JSON matching the schema. No extra text.

### Inputs you will receive
- `project`: requirements, acceptanceCriteria, evidenceRubric.
- `artifacts`: list of submitted artifacts (repo, deployment, video, screenshots) + quick checks (reachability/status) computed by the system.
- `selfEvaluation` (optional): learner's confidence 1–10 + reflection.

### Scoring guidance
- Compute dimension sub-scores from observable signals. If a signal is missing, score that part conservatively.
- `score` is the weighted sum of dimensions; `pass` iff `score >= passThreshold`.
- If the demo URL is unreachable or tests fail, reflect that in **Fonctionnalité**.

### Output JSON schema
Return JSON strictly matching `ReviewOutput`.
```

### 12.2.1 Reviewer — Function Schema (TypeScript + Zod)

```ts
export type ReviewInput = {
  project: SprintPlan['projects'][number]
  artifacts: { type: 'repository'|'deployment'|'video'|'screenshot'; url?: string; status?: 'ok'|'broken'|'missing'; notes?: string }[]
  selfEvaluation?: { confidence: number; reflection?: string }
}

export type ReviewOutput = {
  score: number // 0..1
  achieved: string[]
  missing: string[]
  nextRecommendations: string[] // concrete next steps or micro-remediations
  pass: boolean
}
```

```ts
import { z } from 'zod'

export const zReviewOutput = z.object({
  score: z.number().min(0).max(1),
  achieved: z.array(z.string()),
  missing: z.array(z.string()),
  nextRecommendations: z.array(z.string()).min(1),
  pass: z.boolean()
})
```

### 12.2.2 Reviewer — Heuristics examples

```
- Repo exists + README present → Documentation baseline achieved.
- CI badge green or unit tests passing → Fonctionnalité + Qualité code boost.
- Demo reachable + main flows work (basic checks) → Fonctionnalité achieved.
- Screenshots present + responsive meta present → UX basic achieved.
```

---

### 12.3 Provider Wiring & Determinism

* Use **function calling** (or tools) with the schemas above.
* `temperature`: Planner/Reviewer = 0.2; Coach = 0.6–0.8.
* On schema validation failure: retry with a brief reminder of the schema; at most 2 retries.
* Log: provider, model, token counts, latency, prompt hashes.
 