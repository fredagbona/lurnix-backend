# OAuth2 Integration Plan

## 1. Configuration & Setup
- Add Google and GitHub credentials plus callback URLs to environment config loaders and deployment secrets.
- Document local setup steps (env vars, provider console settings) in README/docs.
- Install Passport core and Google/GitHub strategy packages; ensure TypeScript typings are available or declare custom types.

## 2. Data Layer Updates
- Extend the user model and migrations with `googleId`, `githubId`, `providers` (string array), and `avatar` fields; make `password_hash` optional.
- Add unique indexes on `googleId` and `githubId`, default `providers` to include existing auth methods, and ensure OAuth-created users are marked `isVerified = true` automatically.
- Update repository methods to read/write provider fields, support lookups by provider IDs, and keep legacy password flows unchanged.

## 3. Passport Strategy Integration
- Create a Passport setup module registering Google and GitHub strategies using provider configs, required scopes, and state/nonce handling.
- Normalize provider profiles to a shared shape (`provider`, `providerUserId`, `email`, `fullname`, `avatar`, `emailVerified`), marking OAuth users verified by default.
- Wire Passport serialization stubs if needed for sessionless JWT flow (likely no-op but maintain consistency).

## 4. Auth Service Enhancements
- Implement `authService.handleOAuthLogin(provider, profile)` that:
  - Finds existing users by provider ID; if found, updates `avatar`/`providers` and returns JWT + profile.
  - Else finds by email; if found, links provider after confirming account is active, updates `providers`, `isVerified = true`, and persists provider ID.
  - Else creates a new user with verified status, default language, normalized names, optional avatar, and provider metadata.
- Add `authService.getLinkedProviders(userId)` returning current providers and avatar data.
- Add `authService.unlinkProvider(userId, provider, options)` that enforces at least one remaining login method (password or another provider) and optionally verifies password before unlinking.

## 5. Routes & Controllers
- Add initiation endpoints: `GET /api/auth/google` and `/api/auth/github` that kick off Passport authentication (redirect URL for browser or JSON for SPA).
- Add callback endpoints: `GET /api/auth/google/callback` and `/api/auth/github/callback` using `passport.authenticate` to obtain profile, then invoke service, generate JWT, and redirect to `${FRONTEND_URL}/auth/success?token=...`; handle failure redirect with error messaging.
- Add authenticated management endpoints: `GET /api/auth/linked-accounts` (uses `authenticate` middleware) and `POST /api/auth/unlink/:provider` (validates request, leverages new service logic).
- Ensure controllers use `sendTranslatedResponse`, propagate `providers`/`avatar` in responses, mark OAuth sessions as verified, and introduce new translation keys (e.g., `auth.oauth.loginSuccess`, `auth.oauth.linked`, `auth.oauth.unlinkWarning`, `auth.oauth.error`) with localized strings.

## 6. Middleware & Utilities
- Update JWT payload generation and validation schemas to include optional `providers` and `avatar` fields.
- Adjust auth middleware to pass through new payload fields without breaking existing checks.
- Extend validation schemas for unlink requests (e.g., provider name, optional password confirmation) and ensure rate limiting/CORS cover new endpoints.

## 7. Documentation & Ops
- Refresh Swagger/OpenAPI docs with new routes and response structures, emphasizing automatic email verification for OAuth users.
- Update translation resource files (e.g., `en/translation.json`, `fr/translation.json`) with the new OAuth-related keys referenced in controllers and ensure fallback handling.
- Update deployment checklist for setting provider secrets, verifying redirect URLs, and coordinating frontend changes.
- Provide runbook for OAuth error diagnostics and logging expectations.

## 8. Testing & Verification
- Plan manual test scenarios per spec: new OAuth signup (auto-verified), linking to existing email account, unlink flow safeguards, provider cancellation/error paths, and regression on legacy login/register.
- Capture test cases in QA checklist even though automated tests are deferred for now.

This plan integrates Passport-based Google and GitHub authentication alongside the existing system while ensuring OAuth users are automatically verified.
