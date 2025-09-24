/*
  Warnings:

  - You are about to drop the column `author_id` on the `feature_mod_notes` table. All the data in the column will be lost.
  - You are about to drop the column `changed_by` on the `feature_status_changes` table. All the data in the column will be lost.
  - Added the required column `author_admin_id` to the `feature_mod_notes` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."feature_mod_notes" DROP CONSTRAINT "feature_mod_notes_author_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."feature_status_changes" DROP CONSTRAINT "feature_status_changes_changed_by_fkey";

-- AlterTable
ALTER TABLE "public"."feature_mod_notes" DROP COLUMN "author_id",
ADD COLUMN     "author_admin_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."feature_status_changes" DROP COLUMN "changed_by",
ADD COLUMN     "changed_by_admin_id" TEXT,
ADD COLUMN     "changed_by_user_id" TEXT;

-- AddForeignKey
ALTER TABLE "public"."feature_status_changes" ADD CONSTRAINT "feature_status_changes_changed_by_user_id_fkey" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."feature_status_changes" ADD CONSTRAINT "feature_status_changes_changed_by_admin_id_fkey" FOREIGN KEY ("changed_by_admin_id") REFERENCES "public"."Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."feature_mod_notes" ADD CONSTRAINT "feature_mod_notes_author_admin_id_fkey" FOREIGN KEY ("author_admin_id") REFERENCES "public"."Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
