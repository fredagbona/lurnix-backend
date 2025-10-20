import { z } from 'zod';

export const technicalAssessmentSubmissionSchema = z.object({
  answers: z.object({
    codingExperience: z.enum(['absolute_beginner', 'beginner', 'intermediate', 'advanced']),
    toolExperience: z.array(z.string()).default([]),
    programmingConcepts: z.array(z.string()).default([]),
    projectExperience: z.number().int().min(0).max(3),
    environmentCheck: z.array(z.string()).default([])
  }),
  version: z.number().int().positive().optional()
});

export type TechnicalAssessmentSubmissionSchema = z.infer<typeof technicalAssessmentSubmissionSchema>;
