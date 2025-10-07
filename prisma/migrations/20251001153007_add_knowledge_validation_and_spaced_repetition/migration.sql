/*
  Warnings:

  - You are about to drop the column `createdAt` on the `objectives` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `objectives` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."QuizType" AS ENUM ('pre_sprint', 'post_sprint', 'skill_check', 'review', 'milestone');

-- CreateEnum
CREATE TYPE "public"."QuestionType" AS ENUM ('multiple_choice', 'multiple_select', 'code_completion', 'code_output', 'true_false', 'short_answer');

-- CreateEnum
CREATE TYPE "public"."ReviewType" AS ENUM ('spaced_repetition', 'struggling_skill', 'milestone_prep', 'comprehensive');

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

-- AlterTable
ALTER TABLE "public"."Sprint" ADD COLUMN     "isReviewSprint" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "public"."objectives" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";

-- CreateTable
CREATE TABLE "public"."knowledge_quizzes" (
    "id" TEXT NOT NULL,
    "sprintId" TEXT,
    "objectiveId" TEXT,
    "skillIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "type" "public"."QuizType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "passingScore" INTEGER NOT NULL DEFAULT 80,
    "timeLimit" INTEGER,
    "attemptsAllowed" INTEGER NOT NULL DEFAULT 3,
    "blocksProgression" BOOLEAN NOT NULL DEFAULT true,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."knowledge_quiz_questions" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "type" "public"."QuestionType" NOT NULL,
    "question" TEXT NOT NULL,
    "explanation" TEXT,
    "options" JSONB,
    "codeTemplate" TEXT,
    "expectedOutput" TEXT,
    "difficulty" "public"."SkillDifficulty" NOT NULL DEFAULT 'beginner',
    "skillIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "points" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_quiz_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quiz_attempts" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "timeSpent" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "skillScores" JSONB,

    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."quiz_answers" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answer" JSONB NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "pointsEarned" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."review_schedules" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "firstReview" INTEGER NOT NULL DEFAULT 1,
    "secondReview" INTEGER NOT NULL DEFAULT 7,
    "thirdReview" INTEGER NOT NULL DEFAULT 14,
    "fourthReview" INTEGER NOT NULL DEFAULT 30,
    "fifthReview" INTEGER NOT NULL DEFAULT 60,
    "currentInterval" INTEGER NOT NULL DEFAULT 1,
    "nextReviewAt" TIMESTAMP(3) NOT NULL,
    "lastReviewedAt" TIMESTAMP(3),
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "averageReviewScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isRetained" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."review_sprints" (
    "id" TEXT NOT NULL,
    "sprintId" TEXT NOT NULL,
    "type" "public"."ReviewType" NOT NULL,
    "skillIds" TEXT[],
    "triggerReason" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "preReviewScores" JSONB,
    "postReviewScores" JSONB,
    "improvement" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_sprints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "knowledge_quizzes_sprintId_idx" ON "public"."knowledge_quizzes"("sprintId");

-- CreateIndex
CREATE INDEX "knowledge_quizzes_objectiveId_idx" ON "public"."knowledge_quizzes"("objectiveId");

-- CreateIndex
CREATE INDEX "knowledge_quiz_questions_quizId_idx" ON "public"."knowledge_quiz_questions"("quizId");

-- CreateIndex
CREATE INDEX "quiz_attempts_userId_idx" ON "public"."quiz_attempts"("userId");

-- CreateIndex
CREATE INDEX "quiz_attempts_quizId_idx" ON "public"."quiz_attempts"("quizId");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_attempts_quizId_userId_attemptNumber_key" ON "public"."quiz_attempts"("quizId", "userId", "attemptNumber");

-- CreateIndex
CREATE INDEX "quiz_answers_attemptId_idx" ON "public"."quiz_answers"("attemptId");

-- CreateIndex
CREATE INDEX "quiz_answers_questionId_idx" ON "public"."quiz_answers"("questionId");

-- CreateIndex
CREATE INDEX "review_schedules_userId_nextReviewAt_idx" ON "public"."review_schedules"("userId", "nextReviewAt");

-- CreateIndex
CREATE UNIQUE INDEX "review_schedules_userId_skillId_key" ON "public"."review_schedules"("userId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "review_sprints_sprintId_key" ON "public"."review_sprints"("sprintId");

-- AddForeignKey
ALTER TABLE "public"."knowledge_quizzes" ADD CONSTRAINT "knowledge_quizzes_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "public"."Sprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_quizzes" ADD CONSTRAINT "knowledge_quizzes_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "public"."objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_quiz_questions" ADD CONSTRAINT "knowledge_quiz_questions_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "public"."knowledge_quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_attempts" ADD CONSTRAINT "quiz_attempts_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "public"."knowledge_quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_attempts" ADD CONSTRAINT "quiz_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_answers" ADD CONSTRAINT "quiz_answers_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "public"."quiz_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."quiz_answers" ADD CONSTRAINT "quiz_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."knowledge_quiz_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."review_schedules" ADD CONSTRAINT "review_schedules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."review_schedules" ADD CONSTRAINT "review_schedules_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "public"."skills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."review_sprints" ADD CONSTRAINT "review_sprints_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "public"."Sprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
