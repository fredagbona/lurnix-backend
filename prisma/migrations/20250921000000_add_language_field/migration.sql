-- CreateEnum
CREATE TYPE "Language" AS ENUM ('en', 'fr');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "language" "Language" NOT NULL DEFAULT 'en';