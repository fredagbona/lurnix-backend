# Learner Journey – API Endpoint Reference

**Last Updated:** 2025-10-14  
**Owner:** Backend Platform Team

A consolidated reference of the learner journey from profile assessment through objective creation and sprint execution. Each section lists the primary endpoints, expected request/response shapes, and notes about adaptive metadata.

---

## 1. Profile Acquisition & Technical Assessment

### 1.1 Discover Profile Learning Quiz
`GET /api/quizzes?type=profile`

**200 OK**
```json
{
  "success": true,
  "data": {
    "quizzes": [
      {
        "id": "6e8f6c3c-1345-4fb8-9e6c-3e8aae54f3a1",
        "type": "profile",
        "title": "Brain Adaptive Onboarding",
        "description": "Tell us how you like to learn",
        "passingScore": 0,
        "timeLimit": null,
        "attemptsAllowed": 1,
        "blocksProgression": false,
        "isRequired": true,
        "createdAt": "2025-10-14T17:30:00.000Z",
        "updatedAt": "2025-10-14T17:30:00.000Z"
      }
    ]
  }
}
```

- Returns all adaptive quizzes matching the filter (use `includeQuestions=true` to embed question summaries when needed).
- Frontend picks the active quiz ID, then fetches questions via `GET /api/quizzes/:quizId`.

### 1.2 Fetch Profile Learning Quiz
`GET /api/quizzes/:quizId`

**200 OK**
```json
{
  "success": true,
  "data": {
    "quiz": {
      "id": "quiz-profile-intro",
      "title": "Tell us about your learning journey",
      "description": "Helps us personalise your first sprint",
      "passingScore": null,
      "timeLimit": null,
      "questions": [
        {
          "id": "motivation",
          "type": "single_choice",
          "prompt": "Why are you learning this skill?",
          "options": [
            { "id": "career", "text": "Advance my career" },
            { "id": "switch", "text": "Switch jobs" },
            { "id": "side_project", "text": "Build a side project" }
          ],
          "required": true,
          "sortOrder": 1
        },
        {
          "id": "time_budget",
          "type": "numeric",
          "prompt": "Hours you can learn per week",
          "constraints": { "min": 1, "max": 40 },
          "required": true,
          "sortOrder": 2
        }
      ]
    }
  }
}
```

### 1.3 Submit Profile Learning Quiz
`POST /api/quizzes/:quizId/submit`

```json
{
  "answers": [
    { "questionId": "motivation", "optionId": "career" },
    { "questionId": "time_budget", "value": 12 }
  ],
  "timeSpent": 180
}
```

**200 OK**
```json
{
  "success": true,
  "data": {
    "result": {
      "attemptId": "attempt-uuid",
      "score": null,
      "passed": true,
      "signals": {
        "motivation": "career",
        "hoursPerWeek": 12
      }
    }
  }
}
```

- Updates `LearnerProfile.rawSnapshot` with qualitative context consumed during sprint planning.
- Use `GET /api/quizzes/:quizId/attempts` or `GET /api/quizzes/attempts/:attemptId` only if the UI surfaces attempt history.

### 1.4 Fetch Technical Assessment Questions
`GET /api/technical-assessment`

**200 OK**
```json
{
  "version": 3,
  "questions": [
    {
      "id": "codingExperience",
      "type": "single_choice",
      "prompt": "How comfortable are you writing production-quality code?",
      "options": [
        { "value": "absolute_beginner", "label": "Never coded" },
        { "value": "beginner", "label": "Follow tutorials" },
        { "value": "intermediate", "label": "Ship features" },
        { "value": "advanced", "label": "Architect systems" }
      ],
      "required": true
    },
    {
      "id": "toolExperience",
      "type": "multi_select",
      "prompt": "Which tools have you used in the last 6 months?",
      "options": [
        { "value": "git" },
        { "value": "docker" },
        { "value": "kubernetes" },
        { "value": "none" }
      ]
    },
    {
      "id": "projectExperience",
      "type": "numeric",
      "prompt": "How many production projects have you completed?",
      "constraints": { "min": 0, "max": 5 }
    }
  ]
}
```

### 1.5 Submit Technical Assessment
`POST /api/technical-assessment`

```json
{
  "version": 3,
  "answers": {
    "codingExperience": "beginner",
    "toolExperience": ["git", "docker"],
    "programmingConcepts": ["oop", "testing"],
    "projectExperience": 1,
    "environmentCheck": ["hasCodeEditor", "terminalComfortable"]
  }
}
```

**200 OK**
```json
{
  "version": 3,
  "score": {
    "overall": "beginner",
    "score": 4.75,
    "breakdown": {
      "coding": 2.5,
      "tools": 5.0,
      "concepts": 3.3,
      "autonomy": 8.0
    },
    "flags": {
      "needsEnvironmentSetup": false,
      "needsTerminalIntro": false,
      "needsGitIntro": false,
      "hasProjectExperience": true,
      "canWorkIndependently": false
    },
    "assessedAt": "2025-10-14T16:30:00Z"
  }
}
```

- Responses update `LearnerProfile.technicalLevel` and refresh profile context for downstream planning.

### 1.6 Create / Refresh Learner Profile Snapshot
`POST /api/learner-profiles`

```json
{
  "source": "quiz",
  "hoursPerWeek": 12,
  "strengths": ["frontend", "ui-design"],
  "gaps": ["testing", "architecture"],
  "goals": ["ship production apps"],
  "rawSnapshot": {
    "quizVersion": "v3",
    "scores": {
      "frontend": 0.8,
      "backend": 0.4
    }
  }
}
```

**201 Created**
```json
{
  "success": true,
  "data": {
    "profile": {
      "id": "profile-uuid",
      "source": "quiz",
      "hoursPerWeek": 12,
      "strengths": ["frontend", "ui-design"],
      "gaps": ["testing", "architecture"],
      "technicalLevel": {
        "stack": "fullstack",
        "confidence": 0.62
      }
    } 
  }
}
```

**Key Notes**
- `profileSnapshotId` is later attached to objectives and sprints.
- Technical level is leveraged when building adaptive metadata.

### 1.7 Technical Assessment Questions (Legacy quiz)
`GET /api/learner-profiles/:id/questions`

Optional legacy quizzes remain available; payload mirrors earlier quiz integrations.

---

## 2. Objective Creation & Context

### 2.1 Create Objective
`POST /api/objectives`

```json
{
  "title": "Master DevOps",
  "description": "End-to-end deployment mastery",
  "priority": 4,
  "learnerProfileId": "profile-uuid",
  "successCriteria": ["CI/CD pipeline", "Kubernetes rollout"],
  "requiredSkills": ["docker", "k8s"],
  "dueDate": "2025-12-01T00:00:00Z"
}
```

**201 Created** (excerpt)
```json
{
  "data": {
    "objective": {
      "id": "obj-uuid",
      "status": "active",
      "profileSnapshot": {
        "id": "profile-uuid"
      },
      "limits": {
        "canGenerateSprint": true
      }
    }
  }
}
```

### 2.2 Record Objective Context (optional)
`POST /api/objectives/:objectiveId/context`

```json
{
  "priorKnowledge": ["basic docker"],
  "relatedSkills": ["ci/cd"],
  "urgency": "high",
  "specificDeadline": "2025-11-10T00:00:00Z"
}
```

Context feeds into `buildAdaptiveMetadata()` when generating sprints.

---

## 3. Sprint Generation & Adaptive Metadata

### 3.1 Generate Sprint
`POST /api/objectives/:objectiveId/sprints`

```json
{
  "preferLength": 1,
  "mode": "initial"
}
```

**201 Created** (excerpt)
```json
{
  "data": {
    "sprint": {
      "id": "sprint-uuid",
      "lengthDays": 1,
      "difficulty": "beginner",
      "metadata": {
        "provider": "groq",
        "model": "llama-3.3"
      },
      "adaptiveMetadata": {
        "strategy": "increase_difficulty",
        "difficultyDelta": 12,
        "signals": {
          "hoursPerWeek": 12,
          "performanceTrend": "improving"
        }
      }
    }
  }
}
```

**Implementation Points**
- `objectiveService.generateAndPersistSprint()` resolves adaptive metadata from learner profile, performance analysis, and planner output.
- Data is persisted to `Sprint.adaptiveMetadata` and returned in serialized payloads (`serializeSprint()`).

### 3.2 Expand Existing Sprint
`POST /api/objectives/:objectiveId/sprints/:sprintId/expand`

Payload includes user feedback or expansion goal; response mirrors generation with updated `adaptiveMetadata`.

---

## 4. Sprint Consumption

### 4.1 Fetch Sprint
`GET /api/sprints/:sprintId`

Returns `SprintUiPayload` including adaptive metadata, projects, micro tasks, evidence, review status.

### 4.2 Submit Reflection
`POST /api/sprints/:sprintId/self-evaluation`

```json
{
  "confidence": 4,
  "reflection": "Struggled with Kubernetes manifests; need deeper practice."
}
```

- Persisted to `Sprint.selfEvaluationConfidence` / `Sprint.selfEvaluationReflection`.
- Adaptive planner reads reflections to adjust future sprint difficulty and focus areas.

---

## 5. Knowledge Validation & Adaptation

### 5.1 Fetch Readiness Quiz
`GET /api/sprints/:sprintId/readiness`

Shows requirement to pass pre-sprint quiz; references `knowledge_quizzes` linked to the sprint.

### 5.2 Submit Quiz Attempt
`POST /api/quizzes/:quizId/attempts`

```json
{
  "answers": [
    { "questionId": "q1", "optionId": "d" },
    { "questionId": "q2", "value": false }
  ]
}
```

Response includes score and pass/fail status; triggers skill updates and may adjust adaptation strategy.

### 5.3 Post-Sprint Analysis
Triggered when sprint completes: `adaptiveLearningService` recalculates performance trends and updates `Sprint.adaptiveMetadata` for subsequent generations.

---

## 6. Review & Repetition

### 6.1 Request Sprint Review
`POST /api/sprints/:sprintId/review`

### 6.2 Review Outcome
`GET /api/sprints/:sprintId/review`

Response: review summary, project feedback, and (if available) reviewer-provided adaptive hints.

### 6.3 Schedule Review Sprint
`POST /api/objectives/:objectiveId/review-sprints`

Creates `ReviewSprint` entities when spaced repetition thresholds are hit. Response references `isReviewSprint` flag and selected skills.

---

## 7. Objective Progress & Next Steps

### 7.1 Get Objective Dashboard
`GET /api/objectives/:objectiveId`

Payload includes `currentSprint`, `pastSprints`, and aggregated progress.

### 7.2 List Sprints
`GET /api/objectives/:objectiveId/sprints`

Ordered list of sprints for analytics, each including `adaptiveMetadata` payload.

### 7.3 Generate Next Sprint
Reuse `POST /api/objectives/:objectiveId/sprints` with `mode: "expansion"` or `"milestone"` to drive next phase; adaptive metadata informs difficulty pacing.

---

## 8. Error & Telemetry Considerations

- Ensure clients guard against missing `adaptiveMetadata`.
- Log strategy changes for data analysis.
- Include adaptive metadata snapshots in telemetry to reconstruct learning decisions.

---

## 9. Migration & Deployment Checklist

- [ ] Run `npx prisma migrate dev`.
- [ ] Deploy backend and regenerate clients (if using generated SDKs).
- [ ] Update frontend to surface adaptive metadata (labels, tooltips, analytics).
- [ ] Communicate to CX/support about new adaptive behaviors.

---

## 10. Future Enhancements

- Add versioning to adaptive metadata for long-term backward compatibility.
- Extend telemetry dashboards to visualize adaptation trends.
- Integrate adaptive metadata into review workflows (mentor dashboards).

---

## Appendix A – Related Files

- `prisma/schema.prisma`
- `prisma/migrations/20251020121500_add_adaptive_metadata_to_sprints`
- `src/repositories/sprintRepository.ts`
- `src/services/objectiveService.ts`
- `src/serializers/objectiveSerializer.ts`
- `docs/ADAPTIVE-SPRINT-METADATA.md`
