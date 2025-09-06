-- Add reset token fields to Admin table
ALTER TABLE "Admin" ADD "resetToken" TEXT;
ALTER TABLE "Admin" ADD "resetTokenExpiry" TIMESTAMP;
