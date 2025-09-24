-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateEnum
CREATE TYPE "public"."FeatureStatus" AS ENUM ('open', 'under_review', 'in_progress', 'released', 'declined');

-- CreateEnum
CREATE TYPE "public"."FeatureCategory" AS ENUM ('Roadmaps', 'AI_Mentor', 'Community', 'Integrations', 'Payments', 'UX', 'Other');

-- DropForeignKey
ALTER TABLE "public"."FeatureUsage" DROP CONSTRAINT "FeatureUsage_subscriptionId_fkey";

-- DropForeignKey
ALTER TABLE "public"."FeatureUsage" DROP CONSTRAINT "FeatureUsage_userId_fkey";

-- AlterTable
ALTER TABLE "public"."FeatureUsage" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "public"."feature_requests" (
    "id" BIGSERIAL NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" TEXT NOT NULL,
    "category" "public"."FeatureCategory" NOT NULL DEFAULT 'Other',
    "status" "public"."FeatureStatus" NOT NULL DEFAULT 'open',
    "author_id" TEXT NOT NULL,
    "votes_count" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "merged_into_id" BIGINT,
    "locale" "public"."Language" NOT NULL DEFAULT 'en',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "feature_requests_pkey" PRIMARY KEY ("id")
);

-- Ensure case-insensitive uniqueness on active feature titles
CREATE UNIQUE INDEX "idx_feature_unique_title" ON "public"."feature_requests"(LOWER("title")) WHERE "deleted_at" IS NULL;

-- Support trigram-based title similarity search
CREATE INDEX "feature_requests_title_trgm_idx" ON "public"."feature_requests" USING GIN ("title" gin_trgm_ops);

-- CreateTable
CREATE TABLE "public"."feature_votes" (
    "user_id" TEXT NOT NULL,
    "feature_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_votes_pkey" PRIMARY KEY ("user_id","feature_id")
);

-- CreateTable
CREATE TABLE "public"."feature_status_changes" (
    "id" BIGSERIAL NOT NULL,
    "feature_id" BIGINT NOT NULL,
    "old_status" "public"."FeatureStatus",
    "new_status" "public"."FeatureStatus" NOT NULL,
    "changed_by" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_status_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."feature_mod_notes" (
    "id" BIGSERIAL NOT NULL,
    "feature_id" BIGINT NOT NULL,
    "author_id" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_mod_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feature_requests_status_votes_created_idx" ON "public"."feature_requests"("status", "votes_count", "created_at");

-- CreateIndex
CREATE INDEX "feature_requests_category_status_idx" ON "public"."feature_requests"("category", "status");

-- CreateIndex
CREATE INDEX "feature_status_changes_feature_idx" ON "public"."feature_status_changes"("feature_id");

-- CreateIndex
CREATE INDEX "feature_mod_notes_feature_idx" ON "public"."feature_mod_notes"("feature_id");

-- AddForeignKey
ALTER TABLE "public"."feature_requests" ADD CONSTRAINT "feature_requests_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."feature_requests" ADD CONSTRAINT "feature_requests_merged_into_id_fkey" FOREIGN KEY ("merged_into_id") REFERENCES "public"."feature_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."feature_votes" ADD CONSTRAINT "feature_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."feature_votes" ADD CONSTRAINT "feature_votes_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "public"."feature_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."feature_status_changes" ADD CONSTRAINT "feature_status_changes_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "public"."feature_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."feature_status_changes" ADD CONSTRAINT "feature_status_changes_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."feature_mod_notes" ADD CONSTRAINT "feature_mod_notes_feature_id_fkey" FOREIGN KEY ("feature_id") REFERENCES "public"."feature_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."feature_mod_notes" ADD CONSTRAINT "feature_mod_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeatureUsage" ADD CONSTRAINT "FeatureUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FeatureUsage" ADD CONSTRAINT "FeatureUsage_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."UserSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
