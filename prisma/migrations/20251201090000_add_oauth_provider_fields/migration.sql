-- Alter User table to support OAuth provider data
ALTER TABLE "User"
  ADD COLUMN "googleId" TEXT,
  ADD COLUMN "githubId" TEXT,
  ADD COLUMN "providers" TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
  ADD COLUMN "avatar" TEXT,
  ALTER COLUMN "password_hash" DROP NOT NULL;

-- Ensure provider identifiers remain unique when present
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
CREATE UNIQUE INDEX "User_githubId_key" ON "User"("githubId");

-- Backfill provider information for existing password-based accounts
UPDATE "User"
SET "providers" = ARRAY['email']::TEXT[]
WHERE COALESCE("password_hash", '') <> ''
  AND ("providers" IS NULL OR cardinality("providers") = 0);
