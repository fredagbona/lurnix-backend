# Pricing System Migration Checklist

This document outlines the steps required to migrate an existing environment to the new pricing system with Paddle Billing.

## 1. Pre-Migration Preparation
- [ ] Confirm `prisma migrate diff` output has been reviewed and migrations are ready
- [ ] Ensure backups exist for the production database
- [ ] Confirm Paddle accounts (sandbox/production) are created and accessible
- [ ] Gather plan tier mapping (plan type, billing cycle, Paddle product ID, Paddle price ID)
- [ ] Configure environment variables:
  - `PADDLE_API_KEY`
  - `PADDLE_ENV` (`sandbox` or `production`)
  - `PADDLE_API_URL` (optional, default `https://api.paddle.com`)
  - `PADDLE_WEBHOOK_SECRET`
  - `FRONTEND_URL`
  - Optional: `PADDLE_CHECKOUT_SUCCESS_PATH`, `PADDLE_CHECKOUT_CANCEL_PATH`

## 2. Database Migration
- [ ] Run `npx prisma migrate deploy`
- [ ] Verify new columns/tables exist (`paddleCustomerId`, `paddlePriceId`, `FeatureUsage`, etc.)
- [ ] Seed plans and coupons: `npm run db:seed`
  - [ ] Confirm placeholder Paddle IDs are present for each plan tier
- [ ] Run Paddle ID mapping script with real IDs once they are available:
  ```
  ts-node scripts/mapPaddleIds.ts paddle_mapping.csv
  ```

## 3. Paddle Configuration
- [ ] Create Paddle products and prices for each plan tier
- [ ] Export CSV mapping (plan_type,billing_cycle,paddle_product_id,paddle_price_id)
- [ ] Update mapping via script (see above)
- [ ] Configure Paddle webhook endpoint: `POST /api/webhooks/paddle`
  - [ ] Set webhook secret in environment

## 4. User Migration / Backfill
- [ ] If legacy `User.subscription*` fields exist, run backfill script:
  ```
  ts-node scripts/backfillSubscriptions.ts
  ```
- [ ] Review output for warnings (missing legacy plans, existing subscriptions)
- [ ] Manually validate a sample of migrated users
- [ ] For users without Paddle subscriptions:
  - Option 1: Set to `free` plan manually
  - Option 2: Contact users to re-subscribe via new checkout

## 5. Feature Usage Initialization
- [ ] For existing active subscriptions, consider seeding `FeatureUsage` records with starting values (optional)
- [ ] Verify `featureGateService` responses for key users (free vs paid)

## 6. Manual QA (Smoke Tests)
- Plans API
  - [ ] `GET /api/plans` returns localized metadata with Paddle price IDs
  - [ ] `GET /api/plans/:planType/pricing` works for each tier
- Coupons
  - [ ] `POST /api/coupons/validate` validates and translates error messages
  - [ ] `POST /api/coupons/apply` attaches coupon to subscription
- Subscription creation
  - [ ] `POST /api/subscriptions` returns checkout URL and pending subscription
  - [ ] Complete Paddle checkout, confirm webhook activates subscription
  - [ ] `GET /api/subscriptions/current` reflects active status and coupon metadata
- Billing
  - [ ] Paddle `transaction.completed` webhook inserts invoice row
  - [ ] `GET /api/billing/invoices` (when implemented) returns localized status
- Feature Access
  - [ ] `featureGateService.canAccessFeature` returns expected results per plan
  - [ ] `consumeUsage` enforces limits for limited features

## 7. Fallback / Rollback Plan
- [ ] Keep legacy subscription fields until migration success is confirmed
- [ ] If Paddle provisioning fails:
  - Disable paid checkout routes (return maintenance message)
  - Downgrade affected users to `free` by updating `user_subscriptions`
- [ ] Document manual steps to refund/cancel Paddle subscriptions if needed

## 8. Post-Migration
- [ ] Monitor Paddle webhooks for failures
- [ ] Validate email templates send localized content (subscription confirmation/cancellation)
- [ ] Update documentation for support team (plan names, billing cycles, Paddle management)
- [ ] Schedule periodic sync of Paddle customer IDs (`paddleCustomerId`) for new users

Keep this checklist updated as processes evolve.
