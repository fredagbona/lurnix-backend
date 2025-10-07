# Objectives & Roadmaps Refactor — Implementation Plan

## 1. Align on scope & success
- Review `specs/roadmapFeat.md` with product/design to confirm objectives, sprint flow, paywall rules, and AI provider roadmap.
- Collect current backend/frontend flows for objectives/roadmaps to map migration impact.
- Define success metrics: sprint generation accuracy, roadmap adoption, satisfaction, upgrade rates.

## 2. Consolidate learner profile inputs
- Inventory existing profile quiz outputs; document schema (skills, preferences, availability, passions, blockers).
- Add persistence layer updates so profile snapshots (quiz results + runtime updates) are queryable by Planner.
- Define event hooks to refresh profile after quizzes, reviews, or manual edits.

## 3. Update domain models & contracts
- Extend Objective schema to reference learner profile ID and include contextual fields (availability, priority).
- Harmonize Sprint/Roadmap schema with Objective updates (ensure `profileContext` gets embedded for Planner + UI read).
- Version API contracts (Objective, Sprint, Profile) and update typed clients/Zod validators.

## 4. Planner refactor (roadmap generation)
- Rework Planner input builder to assemble context: learner profile snapshot + active objective + last sprint summary.
- Update prompts/tools to highlight new context fields and enforce portfolio-first constraints.
- Implement validation to ensure generated sprints respect learner availability (hours/week vs sprint length).
- Add regression tests/few-shot updates verifying profile-driven adaptations (e.g. low confidence adds prerequisites).

## 5. Backend services integration
- ObjectivesService: ensure create/update links to profile, sync success criteria, and recalc estimation when profile shifts.
- SprintsService: pipe contextual data to Planner, persist returned roadmap, and log decisions (length, difficulty).
- EvidenceService/EvaluationService: confirm reviewer receives objective + profile info for tailored feedback.
- PlanLimitationService: double-check limits for multi-objective tiers in new flow.

## 6. API layer changes
- Update REST endpoints (`/objectives`, `/sprints/generate`, `/ai/config`) to include profile context in payloads/responses.
- Add endpoint or query param to fetch learner profile snapshots for UI personalization.
- Document breaking changes and provide fallback/feature flag for gradual rollout.

## 7. Frontend updates
- ObjectivePage: display profile-derived context (hours/week, passions) and new sprint recommendations.
- SprintBoard: show adaptation notes highlighting profile-based adjustments; adjust task estimations UI.
- PortfolioWall: surface evidence tied to objectives and highlight reviewer feedback cues.
- Ensure plan tier gating matches new limits.

## 8. Observability, logging & safety
- Enhance AIProvider logging: include profile/objective hash, model used, latency, validation outcomes.
- Add monitoring for schema validation failures and profile mismatch errors.
- Review safety guardrails (resource allowlist, no sensitive data leaks in prompts).

## 9. Testing & QA
- Unit tests for profile persistence, Planner ingestion, and schema validators.
- Integration tests covering objective creation → sprint generation using sample profiles.
- Manually test with LM Studio (dev) and Groq (staging) to compare determinism and output quality.
- UAT with representative learners to validate personalization.

## 10. Rollout plan
- Stage via feature flag: enable new planner for internal users, then beta cohort.
- Prepare migration script for existing objectives to attach default profile snapshots.
- Communicate changes to support/mentors; update documentation and onboarding.
- Monitor metrics post-launch; plan follow-up iteration on personalization weights.

## 11. Domain model & planner input details

### Prisma & persistence deltas
- Introduce `LearnerProfile` table (`id`, `userId`, `source`, `hoursPerWeek`, `strengths`, `gaps`, `passionTags`, `availability`, `lastRefreshedAt`, JSON `rawSnapshot`), linked 1:many from `User` so we can keep history.
- Add `objectiveId` to `Roadmap` rows, transform into a 1:1 Objective↔Roadmap relationship; migrate existing records by creating placeholder objectives with derived metadata.
- Replace milestone-style `Objective` rows with new columns: `priority`, `status`, `estimatedTotalWeeks`, `successCriteria` (JSON array), `requiredSkills` (JSON array), `profileSnapshotId` (FK to `LearnerProfile`).
- Create `Sprint` model (id, objectiveId FK, profileSnapshotId FK, plannerInput JSON, plannerOutput JSON, lengthDays, difficulty, totalEstimatedHours, status, startedAt/completedAt, score, reviewerSummary JSON).
- Extend `Progress` to point to `Sprint` (for micro-task tracking) and store completion stats per sprint instead of entire roadmap; keep roadmap-level streak separately or via view.
- Update Prisma enums to include new objective statuses (`draft`, `active`, `paused`, `completed`) and sprint statuses (`planned`, `in_progress`, `submitted`, `reviewed`).
- Add migration utilities to backfill new tables and move existing JSON blobs into `plannerOutput` while retaining audit history.

### Planner input assembly
- Build `ProfileContextBuilder` service that merges latest `LearnerProfile` snapshot with last quiz result and inline progress signals (blockers, mastered topics, hours logged).
- Update `ObjectivesService` to materialize `ObjectiveContext` JSON (profile + objective metadata + subscriptions limits) every time objective changes.
- Refactor `aiRoadmapService` into `plannerService` that consumes `ObjectiveContext`, `lastSprintOutcome`, and `allowedResources` to call Planner prompt; store request/response on `Sprint` row.
- Include deterministic IDs (`spr_${objectiveId}_${timestamp}`) and track `planner_version` per request for reproducibility.
- Surface validation layer that checks planner output against `LearnerProfile.hoursPerWeek` and objective priority before persisting.

### Contracts & schemas
- Update `src/types/prisma.ts`, `src/types/roadmap.ts`, and `src/schemas/roadmapSchema.ts` with new models/fields.
- Define `zLearnerProfile`, `zObjective`, `zSprintPlan` validators to guard API payloads.
- Version REST interfaces: expose `/profiles/:id/snapshots`, extend `/objectives` DTO with profile context, and add `/sprints/:id` read/write endpoints returning planner output + reviewer scores.

### Data flows
- Quiz completion triggers `LearnerProfile` snapshot creation + objective auto-suggestions.
- Objective creation selects a profile snapshot (latest by default) and instantiates first sprint via Planner.
- Sprint completion pipeline: submit evidence → Reviewer uses sprint + profile context → updates `Sprint.reviewerSummary` and notifies Objective for next sprint decision.
- Paywall enforcement delegates to `PlanLimitationService` with new limits (#objectives, #active sprints) using profile tier.

## 12. Execution backlog & dependencies
- **Backend foundations (Week 1)**: add Prisma migrations for `LearnerProfile`, updated `Objective`, `Sprint`, enum extensions; generate client; update `src/types/prisma.ts` and fix compile errors. *Depends on*: finalized schema design, migration strategy, seed data plan.
- **Profile ingestion service**: implement `ProfileContextBuilder`, extend `quizService` to emit snapshots, create repository for `LearnerProfile`. *Depends on*: new tables, migration deployed.
- **Planner service refactor**: replace `aiRoadmapService` with `plannerService`, update prompts to use objective + profile context, integrate Zod validators. *Depends on*: profile context builder, updated schemas.
- **Objective/Sprint controllers & routes**: introduce `/objectives` CRUD, `/objectives/:id/sprints/generate`, `/sprints/:id/progress`, deprecate legacy `/ai/roadmap/*`. *Depends on*: planner refactor, auth middleware updates.
- **Evidence & evaluation updates**: ensure reviewer path consumes new sprint records; adjust `EvidenceService` to attach artifacts to `Sprint`. *Depends on*: sprint model live.
- **Plan limitation guards**: update enforcement logic to count active objectives/sprints; adjust pricing config. *Depends on*: new controllers.
- **Frontend/API client updates**: regenerate SDK or update fetchers, surface learner context in UI components, toggle new planner via feature flag. *Depends on*: backend endpoints stabilized.
- **QA & rollout**: build integration tests, add migration scripts for existing roadmaps→objectives, run beta flag. *Depends on*: previous work packages merged.

## 13. Implementation status (WIP)
- Prisma schema extended with `LearnerProfile`, richer `Objective`, and new `Sprint` models. Existing roadmap generation now stores quiz-derived profile snapshots and seeds default objectives with profile context.
- `roadmapService.generateRoadmap` returns `{ roadmap, learnerProfile, initialSprint }`, giving the client immediate access to the active profile snapshot and first sprint stub.
- Learner profile and sprint repositories/services are in place (`src/repositories/learnerProfileRepository.ts`, `src/repositories/sprintRepository.ts`, `src/services/learnerProfileService.ts`, `src/services/sprintService.ts`).
- Temporary `/api/objectives` endpoints created with input validation; responses return 501 until planner integrations land.
- Temporary `/api/objectives` endpoints created with input validation; responses now return localized messages via `objectives.*` keys.
- Added translation bundles in `src/locales/{en,fr}/objectives.json` covering creation and sprint flows.
- Planner now calls LM Studio in development and Groq (Llama 3.1 70B) in production via `plannerClient`, with schema validation + fallback heuristics.
- Swagger documentation pending for `/api/objectives` endpoints; ensure translation keys are referenced in API docs so clients surface localized strings.
- Sprints now persist structured planner output (projects, microTasks, portfolio cards) via `plannerService.generateSprintPlan`, and API responses return the plan alongside sprint metadata.
- Next: replace legacy objective scaffolding with planner-generated sprints, wire `/objectives/:id/sprints` to actual planner calls, and update frontend contract docs to surface the localized response structure.
