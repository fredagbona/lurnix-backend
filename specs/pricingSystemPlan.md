Pricing System Refactor Plan (Updated)

Schema & Type Foundations

Introduce PlanType, BillingCycle, status enums in shared types.
Restructure subscription_plans table to match new tier/commitment model and add user_subscriptions, coupons, coupon_redemptions, billing_invoices, plus supporting enums/fields.
Update Prisma schema, regenerate client/types, and adjust repositories/mappers accordingly.

Seed Data & Plan Definitions

Rewrite seeding to populate FREE, BUILDER, MASTER with monthly / 6‑month / 12‑month tiers, including features, limits, pricing.
Remove regional multiplier logic and ensure seeds reflect the new schema structures.


Plan Retrieval & Pricing APIs

Implement GET /api/plans, GET /api/plans/:planType/pricing, POST /api/pricing/calculate.
Update services/controllers to load plan metadata, compute commitment pricing, and surface discounts.
Retire or repurpose old region-based endpoints to align with the new design.


Subscription Lifecycle Service & APIs

Build subscription CRUD flows (create, upgrade, downgrade, cancel, reactivate, getCurrent) against user_subscriptions, handling commitment periods, status transitions, auto-renew logic.
Replace existing subscribe/cancel endpoints with the new payload/response contracts.


Coupon System Implementation

Create coupon schema, validation logic (eligibility, usage caps, applicability rules), and redemption tracking.
Add endpoints for validate/apply/remove coupons and integrate discounts into pricing/subscription creation.
Billing & Stripe Integration

Implement billing calculations (invoices, upcoming charges, payment method updates) and persist to billing_invoices.
Wrap Stripe customer/subscription APIs and process webhook events (subscription.*, invoice.*) to keep state in sync.
Feature Access Control

Introduce FeatureGate service for plan-based entitlements (roadmap limits, AI usage, coaching sessions, etc.).
Expose APIs/utilities so other modules can check and consume feature usage.
Localization & Communications

Define translation keys for all pricing, plan, coupon, and billing copy; supply EN and FR locale files.
Provide localized email templates (confirmation, cancellation, etc.) in both languages and update rendering logic to use translation keys.

QA & Migration Support

Backfill/migrate existing user subscription data into the new model.
Provide documentation and fallback scripts to transition live systems safely.