/*
  Warnings:

  - You are about to drop the `Objective` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId,sprintId]` on the table `Progress` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[objectiveId]` on the table `Roadmap` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."LearnerProfileSource" AS ENUM ('quiz', 'manual', 'review');

-- CreateEnum
CREATE TYPE "public"."SprintGenerationMode" AS ENUM ('DAILY', 'WEEKLY', 'MILESTONE', 'MANUAL');

-- CreateEnum
CREATE TYPE "public"."SprintStatus" AS ENUM ('planned', 'in_progress', 'submitted', 'reviewed');

-- CreateEnum
CREATE TYPE "public"."SprintDifficulty" AS ENUM ('beginner', 'intermediate', 'advanced');

-- CreateEnum
CREATE TYPE "public"."SkillDifficulty" AS ENUM ('beginner', 'intermediate', 'advanced', 'expert');

-- CreateEnum
CREATE TYPE "public"."SkillStatus" AS ENUM ('not_started', 'learning', 'practicing', 'proficient', 'mastered', 'struggling');

-- CreateEnum
CREATE TYPE "public"."ArtifactType" AS ENUM ('repository', 'deployment', 'video', 'screenshot');

-- CreateEnum
CREATE TYPE "public"."ArtifactStatus" AS ENUM ('ok', 'broken', 'missing', 'unknown');

-- AlterEnum
-- Enum values will be added in a separate migration to avoid transaction issues

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
    "status" "public"."ObjectiveStatus" NOT NULL DEFAULT 'todo',
    "estimatedWeeksMin" INTEGER,
    "estimatedWeeksMax" INTEGER,
    "successCriteria" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requiredSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "estimatedTotalDays" INTEGER,
    "estimatedDailyHours" DOUBLE PRECISION,
    "estimationReasoning" TEXT,
    "estimatedAt" TIMESTAMP(3),
    "currentDay" INTEGER NOT NULL DEFAULT 1,
    "completedDays" INTEGER NOT NULL DEFAULT 0,
    "totalSprintsGenerated" INTEGER NOT NULL DEFAULT 0,
    "progressPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "autoGenerateNextSprint" BOOLEAN NOT NULL DEFAULT true,
    "sprintGenerationMode" "public"."SprintGenerationMode" NOT NULL DEFAULT 'DAILY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "learningVelocity" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "currentDifficulty" INTEGER NOT NULL DEFAULT 50,
    "lastRecalibrationAt" TIMESTAMP(3),
    "recalibrationCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "objectives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."objective_milestones" (
    "id" TEXT NOT NULL,
    "objectiveId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetDay" INTEGER NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "objective_milestones_pkey" PRIMARY KEY ("id")
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
    "dayNumber" INTEGER NOT NULL,
    "isAutoGenerated" BOOLEAN NOT NULL DEFAULT false,
    "completionPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "nextSprintId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "targetSkills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "difficultyScore" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "adaptedFrom" TEXT,
    "adaptationReason" TEXT,

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

-- CreateTable
CREATE TABLE "public"."skills" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "parentSkillId" TEXT,
    "prerequisites" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "difficulty" "public"."SkillDifficulty" NOT NULL DEFAULT 'beginner',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_skills" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "status" "public"."SkillStatus" NOT NULL DEFAULT 'not_started',
    "practiceCount" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastPracticedAt" TIMESTAMP(3),
    "masteredAt" TIMESTAMP(3),
    "nextReviewAt" TIMESTAMP(3),
    "reviewInterval" INTEGER NOT NULL DEFAULT 1,
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "needsReview" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sprint_skills" (
    "id" TEXT NOT NULL,
    "sprintId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "targetLevel" INTEGER NOT NULL,
    "practiceType" TEXT NOT NULL,
    "preSprintLevel" INTEGER,
    "postSprintLevel" INTEGER,
    "scoreAchieved" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sprint_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."objective_adaptations" (
    "id" TEXT NOT NULL,
    "objectiveId" TEXT NOT NULL,
    "initialEstimatedDays" INTEGER NOT NULL,
    "currentEstimatedDays" INTEGER NOT NULL,
    "adjustmentReason" TEXT NOT NULL,
    "averageScore" DOUBLE PRECISION NOT NULL,
    "completionRate" DOUBLE PRECISION NOT NULL,
    "velocityMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "difficultyLevel" INTEGER NOT NULL DEFAULT 50,
    "lastAdjustedAt" TIMESTAMP(3) NOT NULL,
    "adjustmentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "objective_adaptations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sprint_adaptations" (
    "id" TEXT NOT NULL,
    "sprintId" TEXT NOT NULL,
    "baseDifficulty" INTEGER NOT NULL,
    "adjustedDifficulty" INTEGER NOT NULL,
    "adjustmentReason" TEXT NOT NULL,
    "adjustments" JSONB NOT NULL,
    "predictedScore" DOUBLE PRECISION,
    "actualScore" DOUBLE PRECISION,
    "predictionAccuracy" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sprint_adaptations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LearnerProfile_userId_createdAt_idx" ON "public"."LearnerProfile"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "objectives_currentDay_status_idx" ON "public"."objectives"("currentDay", "status");

-- CreateIndex
CREATE INDEX "objective_milestones_objectiveId_idx" ON "public"."objective_milestones"("objectiveId");

-- CreateIndex
CREATE INDEX "objective_milestones_objectiveId_targetDay_idx" ON "public"."objective_milestones"("objectiveId", "targetDay");

-- CreateIndex
CREATE UNIQUE INDEX "Sprint_nextSprintId_key" ON "public"."Sprint"("nextSprintId");

-- CreateIndex
CREATE INDEX "Sprint_objectiveId_status_idx" ON "public"."Sprint"("objectiveId", "status");

-- CreateIndex
CREATE INDEX "Sprint_objectiveId_dayNumber_idx" ON "public"."Sprint"("objectiveId", "dayNumber");

-- CreateIndex
CREATE INDEX "Sprint_profileSnapshotId_idx" ON "public"."Sprint"("profileSnapshotId");

-- CreateIndex
CREATE INDEX "SprintArtifact_sprintId_projectId_idx" ON "public"."SprintArtifact"("sprintId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "SprintArtifact_sprintId_artifactId_key" ON "public"."SprintArtifact"("sprintId", "artifactId");

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_key" ON "public"."skills"("name");

-- CreateIndex
CREATE INDEX "skills_category_idx" ON "public"."skills"("category");

-- CreateIndex
CREATE INDEX "user_skills_userId_status_idx" ON "public"."user_skills"("userId", "status");

-- CreateIndex
CREATE INDEX "user_skills_userId_nextReviewAt_idx" ON "public"."user_skills"("userId", "nextReviewAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_skills_userId_skillId_key" ON "public"."user_skills"("userId", "skillId");

-- CreateIndex
CREATE INDEX "sprint_skills_sprintId_idx" ON "public"."sprint_skills"("sprintId");

-- CreateIndex
CREATE UNIQUE INDEX "sprint_skills_sprintId_skillId_key" ON "public"."sprint_skills"("sprintId", "skillId");

-- CreateIndex
CREATE INDEX "objective_adaptations_objectiveId_idx" ON "public"."objective_adaptations"("objectiveId");

-- CreateIndex
CREATE UNIQUE INDEX "sprint_adaptations_sprintId_key" ON "public"."sprint_adaptations"("sprintId");

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
ALTER TABLE "public"."objective_milestones" ADD CONSTRAINT "objective_milestones_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "public"."objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Progress" ADD CONSTRAINT "Progress_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "public"."Sprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Sprint" ADD CONSTRAINT "Sprint_nextSprintId_fkey" FOREIGN KEY ("nextSprintId") REFERENCES "public"."Sprint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Sprint" ADD CONSTRAINT "Sprint_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "public"."objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Sprint" ADD CONSTRAINT "Sprint_profileSnapshotId_fkey" FOREIGN KEY ("profileSnapshotId") REFERENCES "public"."LearnerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SprintArtifact" ADD CONSTRAINT "SprintArtifact_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "public"."Sprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."skills" ADD CONSTRAINT "skills_parentSkillId_fkey" FOREIGN KEY ("parentSkillId") REFERENCES "public"."skills"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_skills" ADD CONSTRAINT "user_skills_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_skills" ADD CONSTRAINT "user_skills_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "public"."skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sprint_skills" ADD CONSTRAINT "sprint_skills_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "public"."Sprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sprint_skills" ADD CONSTRAINT "sprint_skills_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "public"."skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."objective_adaptations" ADD CONSTRAINT "objective_adaptations_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "public"."objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sprint_adaptations" ADD CONSTRAINT "sprint_adaptations_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "public"."Sprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
