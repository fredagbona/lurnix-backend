# Adaptive Sprint Metadata Reference

**Last Updated:** 2025-10-14  
**Owner:** Backend Platform Team

---

## 🎯 Purpose

Sprint generation now emits brain-adaptive metadata that is persisted in the database and exposed through the sprint API payload. This document explains:

- Schema updates and migrations
- Persistence changes in repositories/services
- API payload surfaces
- Guidelines for producers and consumers of adaptive metadata

---

## 🧱 Schema & Migration

| Location | Details |
| --- | --- |
| `prisma/schema.prisma` | Added nullable `adaptiveMetadata Json?` field to `Sprint` model |
| Migration | `20251020121500_add_adaptive_metadata_to_sprints` adds the column in Postgres |

> **Action:** Run `npx prisma migrate dev` (or deploy equivalent) after pulling these changes.

---

## 🗄️ Persistence Changes

### Repository Layer

`src/repositories/sprintRepository.ts`

- `SprintCreateInput` / `SprintUpdateInput` accept optional `adaptiveMetadata` (`Prisma.JsonValue | null`).
- `create()` and `update()` pass the column through to Prisma.

### Service Layer

`src/services/objectiveService.ts`

- Sprint generation stores resolved adaptive metadata (from planner output or adaptive analysis) on the sprint record.
- Sprint expansion updates the existing sprint with the new metadata.
- `buildSprintPayload()` forwards the planner metadata override, including an optional `adaptiveMetadata` override when present.

---

## 🌐 API Surfaces

### Sprint Serialization

`src/serializers/objectiveSerializer.ts`

- `SprintUiPayload` now includes `adaptiveMetadata: Record<string, unknown> | null`.
- `serializeSprint()` selects the value in the following order:
  1. Persisted `sprint.adaptiveMetadata` from the database.
  2. Planner override `adaptiveMetadata` (if supplied while building the payload).
  3. Nested `adaptiveMetadata` inside planner metadata.

### Example Payload Snippet

```json
{
  "sprint": {
    "id": "sprint-123",
    "metadata": {
      "provider": "groq",
      "model": "llama-3.3-70b-versatile"
    },
    "adaptiveMetadata": {
      "strategy": "increase_difficulty",
      "difficultyDelta": 12,
      "reason": "High streak and score > 90%",
      "signals": {
        "performanceTrend": "improving",
        "averageScore": 94
      }
    }
  }
}
```

> Consumers should treat the payload as schemaless JSON. Guard against missing keys and unexpected shapes.

---

## ✅ Producer Guidelines

1. **Always clone before persist** – use `JSON.parse(JSON.stringify(...))` to avoid mutating shared references.
2. **Keep strategies explicit** – include fields like `strategy`, `difficultyDelta`, `reason`, and `signals` for auditability.
3. **Backwards compatibility** – avoid removing keys without versioning the metadata shape.
4. **Null vs Empty** – write `null` when no adaptive metadata is available to keep API responses predictable.

---

## 🔍 Consumer Guidelines

1. **Check for null** – clients must handle `adaptiveMetadata` being `null`.
2. **Feature gating** – maintain UI feature switches until adaptive surfacing is stable.
3. **Analytics** – log strategy + signals to help data science tune adaptation rules.
4. **Versioning** – when consuming specific keys, add fallbacks to handle new strategies.

---

## 📓 Integration Checklist

- [ ] Pull latest repository changes.
- [ ] Run `npm install` (if dependencies changed).
- [ ] Run `npx prisma migrate dev` to apply the new column.
- [ ] Regenerate Prisma client: `npx prisma generate` (if your workflow requires manual regeneration).
- [ ] Rebuild TypeScript: `npm run build`.
- [ ] Verify sprint generation and serialization flows in your environment.

---

## 🧭 Roadmap Follow-up

- Document analytics events for adaptive metadata.
- Add automated tests verifying persistence + serialization.
- Expand API docs with sample requests/responses once telemetry is finalized.

---

## 📬 Contact

For questions or updates, mention **@backend-platform** in the Lurnix Slack `#backend` channel.
