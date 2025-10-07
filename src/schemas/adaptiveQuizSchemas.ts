import { z } from 'zod';

/**
 * Schema for submitting quiz answers
 */
export const submitQuizAnswersSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      answer: z.union([
        z.string(),
        z.array(z.string()),
        z.boolean(),
      ]),
    })
  ).min(1),
  timeSpent: z.number().int().min(0).optional(), // seconds
});

/**
 * Schema for quiz ID parameter
 */
export const quizIdParamSchema = z.object({
  quizId: z.string().uuid(),
});

/**
 * Schema for sprint ID parameter
 */
export const sprintIdParamSchema = z.object({
  sprintId: z.string().uuid(),
});

export type SubmitQuizAnswersInput = z.infer<typeof submitQuizAnswersSchema>;
export type QuizIdParam = z.infer<typeof quizIdParamSchema>;
export type SprintIdParam = z.infer<typeof sprintIdParamSchema>;
