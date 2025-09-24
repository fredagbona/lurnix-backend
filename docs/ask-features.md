# Ask Features

The Ask Features module lets authenticated learners submit feature requests, vote on ideas, and lets moderators curate the backlog from the admin area.

## Public API surface

| Method | Endpoint | Notes |
| --- | --- | --- |
| `GET` | `/api/features/categories` | Returns available feature categories with translation keys. |
| `GET` | `/api/features` | List requests with `status`, `category`, `sort=top|new|trending`, `cursor`, `limit`, `tags`, `q`. Optional auth augments `userVoted`. |
| `POST` | `/api/features` | Auth required. Body: `title`, `description`, `category`, optional `tags[]`. Enforces per-user submission window and returns `duplicates` suggestions. |
| `GET` | `/api/features/:id` | Returns full request details plus last three status updates. Optional auth populates `userVoted`. |
| `POST` | `/api/features/:id/votes` | Auth required. Toggles vote, returns `{ voted, votesCount }`. |

### Rate limiting

Rate limiting uses configuration keys in `.env`:

```
FEATURE_REQUESTS_MAX_PER_DAY=1
FEATURE_REQUESTS_WINDOW_HOURS=24
FEATURE_REQUEST_DUPLICATE_THRESHOLD=0.55
```

## Admin API surface

Mounted under `/api/admin/features` (auth + `support` role minimum):

| Method | Endpoint | Notes |
| --- | --- | --- |
| `GET` | `/api/admin/features/:id` | Full details including moderator notes. |
| `PATCH` | `/api/admin/features/:id` | Update title, description, category, status, tags, merge target. Status changes logged automatically. |
| `POST` | `/api/admin/features/:id/merge` | Body: `{ targetId, closeWithStatus? }`. Moves votes and closes source. |
| `POST` | `/api/admin/features/:id/mod-notes` | Add internal note for other moderators. |

## Manual verification checklist

1. Create a request (`POST /api/features`) with valid payload and confirm `duplicates` array populated when similar titles exist.
2. Vote toggle flow: call `POST /api/features/:id/votes` twice and confirm counter increments then decrements.
3. Change status via admin PATCH and check `statusHistory` shows the new entry.
4. Merge two requests through the admin merge endpoint and ensure votes move to the target.
5. Fetch `/api/features` with filters (`status`, `category`, `sort`, `tags`) to confirm filtering works.
6. Validate localisation keys by switching user locale to `fr` and ensuring the new `features` namespace resolves.

## Translation keys

All user-facing strings for Ask Features live in `src/locales/<lng>/features.json`. Add new phrases there and keep `en` and `fr` in sync.
