-- AlterTable
ALTER TABLE "public"."LearnerProfile" ADD COLUMN     "assessmentCompletedAt" TIMESTAMP(3),
ADD COLUMN     "assessmentVersion" TEXT,
ADD COLUMN     "technicalLevel" JSONB;
