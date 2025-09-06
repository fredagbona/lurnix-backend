-- CreateEnum
CREATE TYPE "public"."SubscriptionStatus" AS ENUM ('free', 'active', 'canceled', 'expired');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "subscriptionEndDate" TIMESTAMP(3),
ADD COLUMN     "subscriptionId" TEXT,
ADD COLUMN     "subscriptionStatus" "public"."SubscriptionStatus" NOT NULL DEFAULT 'free';

-- CreateTable
CREATE TABLE "public"."SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "regionCode" TEXT NOT NULL,
    "interval" TEXT NOT NULL,
    "features" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_code_key" ON "public"."SubscriptionPlan"("code");

-- CreateIndex
CREATE INDEX "SubscriptionPlan_regionCode_idx" ON "public"."SubscriptionPlan"("regionCode");

-- CreateIndex
CREATE INDEX "SubscriptionPlan_isActive_idx" ON "public"."SubscriptionPlan"("isActive");

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."SubscriptionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
