import { z } from 'zod';

// Schema for quiz submission
export const quizSubmissionSchema = z.object({
  version: z.number().int().positive(),
  answers: z.record(z.string(), z.any())
});

// Schema for creating a quiz section
export const createQuizSectionSchema = z.object({
  version: z.number().int().positive(),
  title: z.string().min(1),
  description: z.string().optional(),
  sortOrder: z.number().int().nonnegative(),
  isActive: z.boolean().default(true)
});

// Schema for updating a quiz section
export const updateQuizSectionSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional()
});

// Schema for creating a quiz question
export const createQuizQuestionSchema = z.object({
  version: z.number().int().positive(),
  key: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['single', 'multi', 'scale', 'rank']),
  weightCategory: z.string().optional(),
  sortOrder: z.number().int().nonnegative(),
  isActive: z.boolean().default(true),
  sectionId: z.string().uuid().optional(),
  options: z.array(
    z.object({
      label: z.string().min(1),
      value: z.string().min(1),
      weights: z.record(z.string(), z.number()).optional()
    })
  ).min(1)
});

// Schema for updating a quiz question
export const updateQuizQuestionSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.enum(['single', 'multi', 'scale', 'rank']).optional(),
  weightCategory: z.string().optional(),
  sortOrder: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
  sectionId: z.string().uuid().optional(),
  options: z.array(
    z.object({
      label: z.string().min(1),
      value: z.string().min(1),
      weights: z.record(z.string(), z.number()).optional()
    })
  ).optional()
});

export type QuizSubmissionSchema = z.infer<typeof quizSubmissionSchema>;
export type CreateQuizSectionSchema = z.infer<typeof createQuizSectionSchema>;
export type UpdateQuizSectionSchema = z.infer<typeof updateQuizSectionSchema>;
export type CreateQuizQuestionSchema = z.infer<typeof createQuizQuestionSchema>;
export type UpdateQuizQuestionSchema = z.infer<typeof updateQuizQuestionSchema>;
