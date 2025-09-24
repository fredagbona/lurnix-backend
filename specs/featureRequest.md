Spec for **“Ask Features” with voting**. 
# 1) Goal & Scope

Enable logged-in users to:

* Submit feature requests
* Upvote/downvote (or just upvote) existing requests
* Track status (Open, Under Review, In Progress, Released, Declined)
* See a public roadmap-style list
* Get notified on status changes

Out of scope (for MVP): threaded discussions, file uploads, admin analytics dashboard (we’ll log events; charts later).

# 2) Roles & Permissions

* **Anonymous**: read-only list (optional toggle), cannot vote or submit.
* **User** (logged-in): submit 1 request / 24h (config), 1 upvote per feature, can retract vote.
* **Admin**: edit/merge/label requests, change status, delete, export.


# 3) User Stories (MVP)

1. As a user, I can **open Ask Features** from app nav and see:

   * Search + filters (status, category, sort by “Top / New / Trending”).
   * Cards showing title, short description, votes, status, last update.
2. As a user, I can **submit a request** with title (max 100), description (max 1,000), category (enum), and optional tags.
3. As a user, I can **upvote** an existing request (toggle).
4. As a moderator, I can **edit title/description/category**, **change status**, and add an internal note.
5. As a user, I receive a **notification** if a feature I voted for changes status.

Acceptance criteria per story listed in section 11.

# 4) Data Model (SQL)

```sql
-- users table exists (id, email, role, locale, ...)

CREATE TYPE feature_status AS ENUM ('open','under_review','in_progress','released','declined');
CREATE TYPE feature_category AS ENUM (
  'Roadmaps','AI_Mentor','Community','Integrations','Payments','UX','Other'
);

CREATE TABLE feature_requests (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  category feature_category NOT NULL DEFAULT 'Other',
  status feature_status NOT NULL DEFAULT 'open',
  author_id BIGINT NOT NULL REFERENCES users(id),
  votes_count INT NOT NULL DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  merged_into_id BIGINT NULL REFERENCES feature_requests(id), -- for duplicates
  locale VARCHAR(10) DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE UNIQUE INDEX idx_feature_unique_title ON feature_requests (lower(title)) WHERE deleted_at IS NULL;

CREATE TABLE feature_votes (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature_id BIGINT NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, feature_id)
);

CREATE TABLE feature_status_changes (
  id BIGSERIAL PRIMARY KEY,
  feature_id BIGINT NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
  old_status feature_status,
  new_status feature_status NOT NULL,
  changed_by BIGINT NOT NULL REFERENCES users(id),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE feature_mod_notes (
  id BIGSERIAL PRIMARY KEY,
  feature_id BIGINT NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
  author_id BIGINT NOT NULL REFERENCES users(id),
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Indexes**

* `feature_requests(status, votes_count DESC, created_at DESC)`
* `feature_requests(category, status)`
* `GIN` trigram index on `title` for search (or use pg\_trgm).



# 5) API (REST; GraphQL analog easy later)

**Auth**: Bearer JWT; role from `users.role`.
**Rate limits** (per IP/user via gateway): `POST /features` max 5/day/IP, 1/day/user default; `POST /vote` 60/min.

### List / Search

`GET /api/features?status=open|under_review|...&category=...&sort=top|new|trending&q=...&limit=20&cursor=...`

* 200 → `{ items: [FeatureCard], nextCursor }`
* Sort:

  * `top`: `votes_count DESC, created_at DESC`
  * `new`: `created_at DESC`
  * `trending`: rank from Redis ZSET updated by worker (decay function)

### Create

`POST /api/features`

```json
{
  "title": "Dark mode for editor",
  "description": "Add toggle in settings. Useful at night.",
  "category": "UX",
  "tags": ["accessibility","theme"]
}
```

* Validations: title 6–100 chars; desc 20–1000; category in enum.
* 201 → `FeatureFull`
* 409 → duplicate (use similarity check, see §9)

### Upvote / Unvote

`POST /api/features/:id/votes` (toggle)

* If not voted → create vote, increment counts (DB + Redis)
* If voted → delete vote, decrement
* 200 → `{ voted: true|false, votesCount: n }`

### Get one

`GET /api/features/:id`

* 200 → `FeatureFull` + latest 3 status changes.

### Admin / Moderator

* `PATCH /api/features/:id` body: `{ title?, description?, category?, status?, tags? }`
* `POST /api/features/:id/merge` body: `{ targetId }` (moves votes; sets `merged_into_id` on source; closes source)
* `POST /api/features/:id/mod-notes` body: `{ note }`
* Role guard: moderator+.

### Webhooks / Events (internal)

* `feature.status.changed` payload: `{ featureId, oldStatus, newStatus, changedBy, ts }`
* `feature.created`, `feature.voted`, `feature.merged`



# 7) Ranking: “Trending” Scoring


```

# 8) Notifications

* **In-app** + optional email:

  * On status change for features user voted on or created.
  * Digest weekly: “Top trending asks” (toggle in user settings).
* Template copy:

  * Subject: “An update on a feature you care about”
  * Body: “{title} is now {status}. See details →”

# 9) Duplicate Detection (on create)

* Backend computes trigram similarity of title vs existing open/under\_review.
* If similarity > 0.55 ⇒ suggest top 5 similar:

  * “Looks like these exist. Upvote instead?”
* User can still post; mods can merge later.
* Merge action moves votes: `UPDATE feature_votes SET feature_id = targetId WHERE feature_id = sourceId;` Then mark `merged_into_id` on source.

# 10) Security & Abuse

* **AuthZ**: Only author, admin can edit; users can delete their own request (soft delete).
* **Rate-limits** as above; shadow-ban abusive users (flag on users table).
* **Profanity/Spam**: run description through simple moderation filter; queue for review if flagged.
* **Audit**: store all status changes + mod notes.

# 11) Acceptance Criteria (MVP)

* Submit with valid fields returns 201; shows immediately in “New”.
* Upvote toggles immediately with optimistic UI; count is consistent after refresh.
* Status badge color-codes and filter works.
* Duplicate suggestions appear within 300 ms after title typed.
* A user cannot vote twice on the same feature.
* Lighthouse a11y score ≥ 90 on page; keyboard accessible; labels/aria on toggles.
* i18n ready: strings via translation keys.





# 16) Example Payloads

**FeatureCard**

```json
{
  "id": 412,
  "title": "Dark mode for code editor",
  "excerpt": "Add a toggle in settings...",
  "category": "UX",
  "status": "under_review",
  "votesCount": 128,
  "userVoted": true,
  "updatedAt": "2025-09-18T10:21:00Z"
}
```

**FeatureFull**

```json
{
  "id": 412,
  "title": "Dark mode for code editor",
  "description": "Add toggle...",
  "category": "UX",
  "status": "under_review",
  "tags": ["accessibility","theme"],
  "votesCount": 128,
  "userVoted": true,
  "author": { "id": 55, "name": "Ali" },
  "statusHistory": [
    {"old":"open","new":"under_review","by":"admin:3","at":"2025-09-18T10:21:00Z"}
  ],
  "mergedIntoId": null
}
```

