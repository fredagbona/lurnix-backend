/*
  Warnings:

  - You are about to drop the column `verificationCode` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."Admin" ALTER COLUMN "resetTokenExpiry" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."QuizQuestion" ADD COLUMN     "sectionId" TEXT;

-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "verificationCode";

-- CreateTable
CREATE TABLE "public"."QuizSection" (
    "id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuizSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuizSection_version_idx" ON "public"."QuizSection"("version");

-- CreateIndex
CREATE INDEX "QuizQuestion_sectionId_idx" ON "public"."QuizQuestion"("sectionId");

-- AddForeignKey
ALTER TABLE "public"."QuizQuestion" ADD CONSTRAINT "QuizQuestion_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "public"."QuizSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
