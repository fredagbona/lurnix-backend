-- Add Paddle customer id on users
ALTER TABLE "public"."User"
ADD COLUMN IF NOT EXISTS "paddleCustomerId" TEXT;

-- Add Paddle identifiers on subscription plans
ALTER TABLE "public"."SubscriptionPlan"
ADD COLUMN IF NOT EXISTS "paddlePriceId" TEXT,
ADD COLUMN IF NOT EXISTS "paddleProductId" TEXT;

-- Add Paddle identifiers on user subscriptions
ALTER TABLE "public"."UserSubscription"
ADD COLUMN IF NOT EXISTS "paddleSubscriptionId" TEXT,
ADD COLUMN IF NOT EXISTS "paddleCheckoutId" TEXT;

-- Extend subscription status enum with pending state
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'UserSubscriptionStatus'
      AND e.enumlabel = 'pending'
  ) THEN
    ALTER TYPE "public"."UserSubscriptionStatus" ADD VALUE 'pending';
  END IF;
END $$;

-- Create FeatureUsage table
CREATE TABLE IF NOT EXISTS "public"."FeatureUsage" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "feature" TEXT NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "FeatureUsage_userId_feature_idx"
  ON "public"."FeatureUsage"("userId", "feature");

CREATE UNIQUE INDEX IF NOT EXISTS "FeatureUsage_userId_feature_periodStart_periodEnd_key"
  ON "public"."FeatureUsage"("userId", "feature", "periodStart", "periodEnd");

ALTER TABLE "public"."FeatureUsage"
ADD CONSTRAINT "FeatureUsage_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE;

ALTER TABLE "public"."FeatureUsage"
ADD CONSTRAINT "FeatureUsage_subscriptionId_fkey"
FOREIGN KEY ("subscriptionId") REFERENCES "public"."UserSubscription"("id") ON DELETE CASCADE;
