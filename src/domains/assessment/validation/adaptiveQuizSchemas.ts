import { z } from 'zod';

/**
 * Schema for submitting quiz answers
 */
const answerValueSchema = z.union([
  z.string(),
  z.array(z.string()),
  z.boolean(),
]);

const rawAnswerSchema = z.object({
  questionId: z.string().uuid(),
  answer: answerValueSchema.optional(),
  optionId: z.string().optional(),
  optionIds: z.array(z.string()).optional(),
}).superRefine((value, ctx) => {
  const provided = [value.answer, value.optionId, value.optionIds].filter((v) => v !== undefined);
  if (provided.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'answer, optionId, or optionIds is required',
      path: ['answer'],
    });
  }
  if (value.answer !== undefined && value.optionId !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Provide either answer or optionId, not both',
      path: ['answer'],
    });
  }
  if (value.answer !== undefined && value.optionIds !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Provide either answer or optionIds, not both',
      path: ['answer'],
    });
  }
  if (value.optionId !== undefined && value.optionIds !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Provide optionId or optionIds, not both',
      path: ['optionId'],
    });
  }
}).transform((value) => {
  if (value.answer !== undefined) {
    return {
      questionId: value.questionId,
      answer: value.answer,
    };
  }

  if (value.optionId !== undefined) {
    return {
      questionId: value.questionId,
      answer: value.optionId,
    };
  }

  if (value.optionIds !== undefined) {
    return {
      questionId: value.questionId,
      answer: value.optionIds,
    };
  }

  return {
    questionId: value.questionId,
    answer: value.answer,
  };
});

export const submitQuizAnswersSchema = z.object({
  answers: z.array(rawAnswerSchema).min(1),
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
