-- CreateTable
CREATE TABLE "public"."knowledge_quiz_translations" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_quiz_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."knowledge_quiz_question_translations" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB,
    "explanation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_quiz_question_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "knowledge_quiz_translations_language_idx" ON "public"."knowledge_quiz_translations"("language");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_quiz_translations_quizId_language_key" ON "public"."knowledge_quiz_translations"("quizId", "language");

-- CreateIndex
CREATE INDEX "knowledge_quiz_question_translations_language_idx" ON "public"."knowledge_quiz_question_translations"("language");

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_quiz_question_translations_questionId_language_key" ON "public"."knowledge_quiz_question_translations"("questionId", "language");

-- AddForeignKey
ALTER TABLE "public"."knowledge_quiz_translations" ADD CONSTRAINT "knowledge_quiz_translations_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "public"."knowledge_quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."knowledge_quiz_question_translations" ADD CONSTRAINT "knowledge_quiz_question_translations_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."knowledge_quiz_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
