




# Implementation Plan

## Phase 1 · Technical Assessment & Learner Profile
- **Design assessment flow**: Define question bank, scoring (`technical_level` with breakdown + flags), and UI placement after the learner style quiz.
- **Backend APIs**:
  - `POST /api/assessment/technical` → validate answers, compute scores, persist via [learnerProfileService.updateSnapshot()](cci:1://file:///Users/freddyagbona/Documents/workspace/projects/lurnix/dev/lurnix-backend/src/services/learnerProfileService.ts:61:2-91:3) storing `technical_level`, `assessment_completed_at`, `assessment_version`.
  - `GET /api/assessment/questions` → serve dynamic question sets (versioned).
- **Database migration**: Add `technical_level` JSONB, `assessment_completed_at`, `assessment_version` to `LearnerProfile` table.
- **Integration**: Update [profileContextBuilder.serializeLearnerProfile()](cci:1://file:///Users/freddyagbona/Documents/workspace/projects/lurnix/dev/lurnix-backend/src/services/profileContextBuilder.ts:171:2-190:3) to expose technical fields; adjust `objectiveEstimationService` call sites to expect enriched profile.
- **Frontend**: Extend onboarding flow with new assessment screens, results confirmation, retry logic.

## Phase 2 · Objective Context & Estimation
- **Objective context intake**: Extend `POST /api/objectives` to accept `priorKnowledge`, `relatedSkills`, `urgency`, `depthPreference`, `deadline`, `domainExperience`, `timeCommitment`.
- **Data persistence**: Create `objective_contexts` table; link to `objectiveId` and `userId`, storing AI-extracted skills and urgency metadata.
- **Skill extraction service**: Implement `skillExtractionService.extractSkills()` to parse free text using AI; store results for estimation and prompts.
- **Duration estimation upgrade**: Enhance [objectiveEstimationService.estimateObjectiveDuration()](cci:1://file:///Users/freddyagbona/Documents/workspace/projects/lurnix/dev/lurnix-backend/src/services/objectiveEstimationService.ts:192:2-288:3) to incorporate `technical_level`, context modifiers, urgency compression, and prior knowledge discounts; produce confidence scores and prerequisites list.
- **API updates**: Return context and enriched estimate in objective creation response.
- **Frontend updates**: Multi-step objective wizard with context capture and estimate preview.

## Phase 3 · Adaptive Sprint Generation
- **Planner strategy registry**: Introduce level-specific templates in `plannerService` for `absolute_beginner`, `beginner`, `intermediate`, `advanced`, containing pacing, resource rules, and day-one requirements.
- **Prompt generator**: Build `AdaptivePromptGenerator` that assembles prompts using level, context, urgency, and previously stored technical flags (e.g., environment readiness).
- **Environment validation**: Ensure first sprint day handles setup when `needsEnvironmentSetup` or `needsTerminalIntro` are true.
- **Milestone alignment**: Adjust sprint objectives and acceptance criteria to match level-specific expectations; integrate with recalibrated milestone scheduling.
- **API response metadata**: Include `generation_strategy`, `user_level`, `adaptations_applied`, `confidence_score` in sprint responses.
- **UI**: Display level badge, adaptation summary, allow requesting alternate difficulty with `GET /api/sprints/:id/alternatives?target_level=`.

### AdaptivePlanMetadata Contract

- **Interface**
  ```ts
  export interface AdaptivePlanMetadata {
    strategy: 'absolute_beginner' | 'beginner' | 'intermediate' | 'advanced' | 'accelerated';
    userLevel: 'absolute_beginner' | 'beginner' | 'intermediate' | 'advanced';
    inputs: {
      technicalLevelScore?: number;
      hoursPerWeek?: number;
      timeCommitmentHours?: number;
      urgency?: 'low' | 'medium' | 'high';
      needsEnvironmentSetup?: boolean;
      needsTerminalIntro?: boolean;
      performanceTrend?: 'improving' | 'stable' | 'declining';
    };
    adjustmentsApplied: string[];
    confidence: number; // 0-1 range
    computedAt: string;
    computedBy: 'server';
  }
  ```
- **Data sources**
  - Technical assessment flags via `learnerProfile.technicalLevel` (`technicalAssessmentService`).
  - Objective context signals (`priorKnowledge`, `focusAreas`, `urgency`, `timeCommitmentHours`) from `ObjectiveContext`.
  - Performance trends from `adaptiveLearningService.analyzePerformance()`.
  - Environment readiness flags (`needsEnvironmentSetup`, `needsTerminalIntro`) from technical assessment score.
- **Computation**
  - `generateAdaptiveMetadata()` (new `src/services/sprintAdaptationStrategy.ts`) composes the interface, calculates confidence, and lists `adjustmentsApplied`.
  - Fallback: default `strategy = 'beginner'`, empty adjustments, `confidence = 0.3` when signals missing.
- **Integration steps**
  - Inject `adaptiveMetadata` into `plannerService.buildPlannerPayload()` and persist on `SprintPlan` outputs.
  - Surface metadata through sprint serialization and API responses (`serializeSprint`).
  - Guard rollout with `FEATURE_ADAPTIVE_PLANNER` toggle and log telemetry for A/B tests.

## Phase 4 · Feedback & Analytics
- **Feedback endpoints**:
  - `POST /api/assessment/validate` → user confirms or adjusts assigned level.
  - `POST /api/sprints/:id/difficulty-feedback` → collect difficulty perception and time actuals per task.
- **Data tracking**: Augment `seven_day_roadmaps` (or `Sprint`) with `user_technical_level`, `generation_strategy`, `level_adaptations`, `estimated_total_hours`, `actual_hours`.
- **Analytics dashboard**: Build queries and views for level distribution, sprint success by level, estimation accuracy, retention.
- **Notifications**: Trigger recalibration alerts when difficulty feedback indicates mismatch.

## Phase 5 · Rollout & Optimization
- **Feature flags**: Guard technical assessment, context capture, and adaptive planner behind toggles for staged rollout (5% → 25% → 100%).
- **A/B experimentation**: Compare adaptive vs. legacy planner for key cohorts before full migration.
- **Documentation & training**: Update internal playbooks, support FAQs, and onboarding guides; prepare marketing comms for launch.
- **Maintenance**: Establish continuous improvement loop—monthly prompt reviews, data-driven level threshold tuning, resource curation by level.

# Risks & Mitigations
- **Assessment fatigue**: Mitigate with progressive disclosure, saved progress, clear value messaging.
- **AI prompt complexity**: Use templated segments and caching; monitor latency.
- **Data integrity**: Write backward-compatible migrations, provide defaults for legacy profiles, backup before rollout.
- **User disagreement with level**: Provide validation endpoint and manual override UI.

   