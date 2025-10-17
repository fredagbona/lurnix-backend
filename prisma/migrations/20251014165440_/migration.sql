-- CreateTable
CREATE TABLE "public"."objective_contexts" (
    "id" TEXT NOT NULL,
    "objectiveId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "priorKnowledge" JSONB DEFAULT '[]',
    "relatedSkills" JSONB DEFAULT '[]',
    "urgency" TEXT,
    "specificDeadline" TIMESTAMP(3),
    "depthPreference" TEXT,
    "focusAreas" JSONB DEFAULT '[]',
    "extractedSkills" JSONB DEFAULT '[]',
    "timeCommitmentHours" INTEGER,
    "domainExperience" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "objective_contexts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "objective_contexts_objectiveId_idx" ON "public"."objective_contexts"("objectiveId");

-- CreateIndex
CREATE INDEX "objective_contexts_userId_idx" ON "public"."objective_contexts"("userId");

-- AddForeignKey
ALTER TABLE "public"."objective_contexts" ADD CONSTRAINT "objective_contexts_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "public"."objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."objective_contexts" ADD CONSTRAINT "objective_contexts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
