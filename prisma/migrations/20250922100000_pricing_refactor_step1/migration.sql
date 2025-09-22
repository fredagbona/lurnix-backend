-- CreateEnum
CREATE TYPE "public"."PlanType" AS ENUM ('free', 'builder', 'master');

-- CreateEnum
CREATE TYPE "public"."BillingCycle" AS ENUM ('monthly', '6_months', '12_months');

-- CreateEnum
CREATE TYPE "public"."UserSubscriptionStatus" AS ENUM ('active', 'cancelled', 'expired', 'paused');

-- CreateEnum
CREATE TYPE "public"."CouponDiscountType" AS ENUM ('percentage', 'fixed_amount');

-- CreateEnum
CREATE TYPE "public"."CouponAppliesTo" AS ENUM ('all', 'plan_type', 'specific_plan');

-- CreateEnum
CREATE TYPE "public"."InvoiceStatus" AS ENUM ('pending', 'paid', 'failed', 'refunded');

-- DropForeignKey
ALTER TABLE "public"."User" DROP CONSTRAINT "User_subscriptionId_fkey";

-- DropIndex
DROP INDEX "public"."SubscriptionPlan_code_key";

-- DropIndex
DROP INDEX "public"."SubscriptionPlan_regionCode_idx";

-- AlterTable
ALTER TABLE "public"."SubscriptionPlan" DROP COLUMN "code",
DROP COLUMN "currency",
DROP COLUMN "interval",
DROP COLUMN "price",
DROP COLUMN "regionCode",
ADD COLUMN     "billingAmount" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "billingCycle" "public"."BillingCycle" NOT NULL,
ADD COLUMN     "commitmentMonths" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "discountPercentage" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "limits" JSONB NOT NULL,
ADD COLUMN     "planType" "public"."PlanType" NOT NULL,
ADD COLUMN     "pricePerPeriod" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "stripePriceId" TEXT;

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "subscriptionEndDate",
DROP COLUMN "subscriptionId",
DROP COLUMN "subscriptionStatus";

-- DropEnum
DROP TYPE "public"."SubscriptionStatus";

-- CreateTable
CREATE TABLE "public"."UserSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "public"."UserSubscriptionStatus" NOT NULL DEFAULT 'active',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "commitmentEndDate" TIMESTAMP(3),
    "autoRenewal" BOOLEAN NOT NULL DEFAULT true,
    "stripeSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "UserSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Coupon" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "discountType" "public"."CouponDiscountType" NOT NULL,
    "discountValue" DECIMAL(10,2) NOT NULL,
    "appliesTo" "public"."CouponAppliesTo" NOT NULL DEFAULT 'all',
    "appliesToValue" TEXT,
    "minimumCommitment" "public"."BillingCycle",
    "firstTimeUsersOnly" BOOLEAN NOT NULL DEFAULT false,
    "maxRedemptions" INTEGER,
    "currentRedemptions" INTEGER NOT NULL DEFAULT 0,
    "maxPerUser" INTEGER,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CouponRedemption" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "discountAmount" DECIMAL(10,2) NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BillingInvoice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "discountAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "finalAmount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "public"."InvoiceStatus" NOT NULL DEFAULT 'pending',
    "stripeInvoiceId" TEXT,
    "couponId" TEXT,
    "billingPeriodStart" TIMESTAMP(3) NOT NULL,
    "billingPeriodEnd" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserSubscription_userId_idx" ON "public"."UserSubscription"("userId");

-- CreateIndex
CREATE INDEX "UserSubscription_planId_idx" ON "public"."UserSubscription"("planId");

-- CreateIndex
CREATE INDEX "UserSubscription_status_idx" ON "public"."UserSubscription"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "public"."Coupon"("code");

-- CreateIndex
CREATE INDEX "Coupon_isActive_idx" ON "public"."Coupon"("isActive");

-- CreateIndex
CREATE INDEX "Coupon_validFrom_idx" ON "public"."Coupon"("validFrom");

-- CreateIndex
CREATE INDEX "Coupon_validUntil_idx" ON "public"."Coupon"("validUntil");

-- CreateIndex
CREATE INDEX "CouponRedemption_couponId_idx" ON "public"."CouponRedemption"("couponId");

-- CreateIndex
CREATE INDEX "CouponRedemption_userId_idx" ON "public"."CouponRedemption"("userId");

-- CreateIndex
CREATE INDEX "CouponRedemption_subscriptionId_idx" ON "public"."CouponRedemption"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingInvoice_invoiceNumber_key" ON "public"."BillingInvoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "BillingInvoice_userId_idx" ON "public"."BillingInvoice"("userId");

-- CreateIndex
CREATE INDEX "BillingInvoice_subscriptionId_idx" ON "public"."BillingInvoice"("subscriptionId");

-- CreateIndex
CREATE INDEX "BillingInvoice_couponId_idx" ON "public"."BillingInvoice"("couponId");

-- CreateIndex
CREATE INDEX "BillingInvoice_status_idx" ON "public"."BillingInvoice"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_planType_billingCycle_key" ON "public"."SubscriptionPlan"("planType", "billingCycle");

-- AddForeignKey
ALTER TABLE "public"."UserSubscription" ADD CONSTRAINT "UserSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserSubscription" ADD CONSTRAINT "UserSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "public"."Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CouponRedemption" ADD CONSTRAINT "CouponRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CouponRedemption" ADD CONSTRAINT "CouponRedemption_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."UserSubscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BillingInvoice" ADD CONSTRAINT "BillingInvoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BillingInvoice" ADD CONSTRAINT "BillingInvoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."UserSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BillingInvoice" ADD CONSTRAINT "BillingInvoice_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "public"."Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
