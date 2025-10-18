import { z } from 'zod';

export const objectiveContextSchema = z.object({
  priorKnowledge: z.array(z.string().min(1)).max(20).optional(),
  relatedSkills: z.array(z.string().min(1)).max(30).optional(),
  focusAreas: z.array(z.string().min(1)).max(20).optional(),
  urgency: z.string().min(1).max(50).optional(),
  depthPreference: z.string().min(1).max(50).optional(),
  deadline: z
    .string()
    .datetime({ offset: true })
    .or(z.string().datetime())
    .optional(),
  domainExperience: z.string().min(1).max(200).optional(),
  timeCommitmentHours: z.number().int().min(1).max(168).optional(),
  notes: z.string().min(1).max(500).optional()
});

export const createObjectiveSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  learnerProfileId: z.string().uuid().optional(),
  successCriteria: z.array(z.string()).optional(),
  requiredSkills: z.array(z.string()).optional(),
  priority: z.number().int().min(1).max(5).optional(),
  context: objectiveContextSchema.optional()
});

export const generateSprintSchema = z.object({
  objectiveId: z.string().uuid(),
  learnerProfileId: z.string().uuid().optional(),
  preferLength: z
    .number()
    .int()
    .refine((value) => [1, 3, 7, 14].includes(value), 'preferLength must be 1, 3, 7, or 14 days')
    .optional(),
  allowedResources: z.array(z.string()).optional()
});

export const expandSprintSchema = z.object({
  objectiveId: z.string().uuid(),
  sprintId: z.string().uuid(),
  targetLengthDays: z
    .number()
    .int()
    .refine((value) => [1, 3, 7, 14].includes(value), 'targetLengthDays must be 1, 3, 7, or 14 days')
    .optional(),
  additionalDays: z.number().int().min(1).max(14).optional(),
  additionalMicroTasks: z.number().int().min(1).max(12).optional()
});
