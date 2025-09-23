/*
  Warnings:

  - You are about to drop the column `language` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."User" DROP COLUMN "language";

-- DropEnum
DROP TYPE "public"."Language";
