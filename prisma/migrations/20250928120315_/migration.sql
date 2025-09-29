/*
  Warnings:

  - You are about to drop the `Objective` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId,sprintId]` on the table `Progress` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[objectiveId]` on the table `Roadmap` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."LearnerProfileSource" AS ENUM ('quiz', 'manual', 'review');

-- CreateEnum
CREATE TYPE "public"."SprintStatus" AS ENUM ('planned', 'in_progress', 'submitted', 'reviewed');

-- CreateEnum
CREATE TYPE "public"."SprintDifficulty" AS ENUM ('beginner', 'intermediate', 'advanced');

-- CreateEnum
CREATE TYPE "public"."ArtifactType" AS ENUM ('repository', 'deployment', 'video', 'screenshot');

-- CreateEnum
CREATE TYPE "public"."ArtifactStatus" AS ENUM ('ok', 'broken', 'missing', 'unknown');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."ObjectiveStatus" ADD VALUE 'draft';
ALTER TYPE "public"."ObjectiveStatus" ADD VALUE 'active';
ALTER TYPE "public"."ObjectiveStatus" ADD VALUE 'paused';
ALTER TYPE "public"."ObjectiveStatus" ADD VALUE 'completed';

-- DropForeignKey
ALTER TABLE "public"."Objective" DROP CONSTRAINT "Objective_roadmapId_fkey";

-- AlterTable
ALTER TABLE "public"."Progress" ADD COLUMN     "sprintId" TEXT,
ALTER COLUMN "roadmapId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Roadmap" ADD COLUMN     "objectiveId" TEXT;

-- DropTable
DROP TABLE "public"."Objective";

-- CreateTable
CREATE TABLE "public"."LearnerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" "public"."LearnerProfileSource" NOT NULL DEFAULT 'quiz',
    "hoursPerWeek" INTEGER,
    "strengths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "gaps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "passionTags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "availability" JSONB,
    "blockers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "goals" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lastRefreshedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rawSnapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearnerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."objectives" (
    "id" TEXT NOT NULL,
    "roadmapId" TEXT,
    "profileSnapshotId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 3,
    "status" "public"."ObjectiveStatus" NOT NULL DEFAULT 'draft',
    "estimatedWeeksMin" INTEGER,
    "estimatedWeeksMax" INTEGER,
    "successCriteria" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiredSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "objectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Sprint" (
    "id" TEXT NOT NULL,
    "objectiveId" TEXT NOT NULL,
    "profileSnapshotId" TEXT,
    "plannerInput" JSONB NOT NULL,
    "plannerOutput" JSONB NOT NULL,
    "lengthDays" INTEGER NOT NULL,
    "totalEstimatedHours" INTEGER NOT NULL,
    "difficulty" "public"."SprintDifficulty" NOT NULL DEFAULT 'beginner',
    "status" "public"."SprintStatus" NOT NULL DEFAULT 'planned',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "score" DOUBLE PRECISION,
    "reviewerSummary" JSONB,
    "selfEvaluationConfidence" INTEGER,
    "selfEvaluationReflection" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SprintArtifact" (
    "id" TEXT NOT NULL,
    "sprintId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "artifactId" TEXT NOT NULL,
    "title" TEXT,
    "type" "public"."ArtifactType" NOT NULL,
    "url" TEXT,
    "status" "public"."ArtifactStatus" NOT NULL DEFAULT 'unknown',
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SprintArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LearnerProfile_userId_createdAt_idx" ON "public"."LearnerProfile"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Sprint_objectiveId_status_idx" ON "public"."Sprint"("objectiveId", "status");

-- CreateIndex
CREATE INDEX "Sprint_profileSnapshotId_idx" ON "public"."Sprint"("profileSnapshotId");

-- CreateIndex
CREATE INDEX "SprintArtifact_sprintId_projectId_idx" ON "public"."SprintArtifact"("sprintId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "SprintArtifact_sprintId_artifactId_key" ON "public"."SprintArtifact"("sprintId", "artifactId");

-- CreateIndex
CREATE UNIQUE INDEX "Progress_userId_sprintId_key" ON "public"."Progress"("userId", "sprintId");

-- CreateIndex
CREATE UNIQUE INDEX "Roadmap_objectiveId_key" ON "public"."Roadmap"("objectiveId");

-- AddForeignKey
ALTER TABLE "public"."LearnerProfile" ADD CONSTRAINT "LearnerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Roadmap" ADD CONSTRAINT "Roadmap_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "public"."objectives"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."objectives" ADD CONSTRAINT "objectives_roadmapId_fkey" FOREIGN KEY ("roadmapId") REFERENCES "public"."Roadmap"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."objectives" ADD CONSTRAINT "objectives_profileSnapshotId_fkey" FOREIGN KEY ("profileSnapshotId") REFERENCES "public"."LearnerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Progress" ADD CONSTRAINT "Progress_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "public"."Sprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Sprint" ADD CONSTRAINT "Sprint_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "public"."objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Sprint" ADD CONSTRAINT "Sprint_profileSnapshotId_fkey" FOREIGN KEY ("profileSnapshotId") REFERENCES "public"."LearnerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SprintArtifact" ADD CONSTRAINT "SprintArtifact_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "public"."Sprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
