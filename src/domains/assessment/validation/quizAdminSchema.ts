import { z } from 'zod';

// Base schema for quiz question
const quizQuestionBaseSchema = z.object({
  key: z.string().min(3).max(50),
  title: z.string().min(5).max(200),
  description: z.string().min(5).max(500),
  type: z.enum(['single_select', 'multi_select']),
  weightCategory: z.string().min(2).max(50),
  sortOrder: z.number().int().positive(),
  isActive: z.boolean().default(true),
  version: z.number().int().positive(),
});

// Schema for creating a new quiz question
export const createQuizQuestionSchema = quizQuestionBaseSchema;

// Schema for updating an existing quiz question
export const updateQuizQuestionSchema = quizQuestionBaseSchema.partial().extend({
  id: z.string().uuid(),
});

// Base schema for quiz option
const quizOptionBaseSchema = z.object({
  label: z.string().min(3).max(200),
  value: z.string().min(1).max(50),
  weights: z.record(z.string(), z.number().min(0).max(1)),
});

// Schema for creating a new quiz option
export const createQuizOptionSchema = quizOptionBaseSchema.extend({
  questionId: z.string().uuid(),
});

// Schema for updating an existing quiz option
export const updateQuizOptionSchema = quizOptionBaseSchema.partial().extend({
  id: z.string().uuid(),
});

// Schema for creating a quiz question with options
export const createQuizQuestionWithOptionsSchema = quizQuestionBaseSchema.extend({
  options: z.array(quizOptionBaseSchema).min(1),
});

// Schema for retrieving quiz questions with pagination
export const getQuizQuestionsSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(10),
  version: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

// Schema for retrieving a specific quiz question by ID
export const getQuizQuestionByIdSchema = z.object({
  id: z.string().uuid(),
});

// Schema for deleting a quiz question
export const deleteQuizQuestionSchema = z.object({
  id: z.string().uuid(),
});

// Schema for deleting a quiz option
export const deleteQuizOptionSchema = z.object({
  id: z.string().uuid(),
});
