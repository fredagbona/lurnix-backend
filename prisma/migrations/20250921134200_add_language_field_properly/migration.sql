-- CreateEnum
CREATE TYPE "public"."Language" AS ENUM ('en', 'fr');

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "language" "public"."Language" NOT NULL DEFAULT 'en';
