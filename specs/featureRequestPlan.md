1. Review current auth, rate-limiting, localisation, and event hubs to confirm alignment with the feature spec and note integration points for feature requests, votes, and status history.


2. Add migration introducing feature_status/feature_category enums and the feature_requests, feature_votes, feature_status_changes, and feature_mod_notes tables plus supporting indexes, soft-delete constraints, and cascading behaviour.


3. Define backend domain/ORM models for feature requests, votes, status history, and moderator notes; expose repository helpers for filtering, pagination, vote toggles, duplicate lookup, and status transitions.


4. Implement duplicate-detection service using trigram similarity (or equivalent DB search) with configurable threshold and response payload for the submission flow.


5. Build GET /api/features with status/category filters, text search, cursor pagination, and sort modes (top, new, trending), computing “trending” on demand via SQL ranking or lightweight scoring without external cache dependencies; ensure anonymous visibility rules are enforced.


6. Implement POST /api/features with validation, per-user rate limiting (configurable 1/day), duplicate suggestion response, locale capture, and event logs for future analytics.


7. Deliver vote toggle endpoint POST /api/features/:id/votes supporting optimistic updates, retract logic, concurrency-safe counter updates, and audit logging.


8. Create detail endpoint GET /api/features/:id returning full record, author summary, merge target reference, latest three status changes, and current user vote state.

9. Provide moderator/admin endpoints for editing (PATCH), merging (POST .../merge performing vote reassignment and close-out), and internal notes (POST .../mod-notes) with strict role guards and status-change recording.



10. Extend API clients and frontend/admin surfaces with Ask Features navigation, list and detail views, submission modal/form, vote controls, filtering UI, and moderator tools; include duplicate suggestion UX and consistent status badges.


11. Register translation keys for all new UI copy, validation errors, email placeholders (for future use), and status labels; update localisation files (e.g., locales/en.json, locales/fr.json others as applicable) and confirm fallback behaviour.

12. Document new configuration knobs (rate limits, categories, locale defaults), database migration steps, and a manual verification checklist covering submission, voting, filtering, merging, and localisation review.