import { z } from 'zod';
import { RoadmapType } from '../types/prisma';

export const createObjectiveSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  roadmapType: z.nativeEnum(RoadmapType).optional(),
  learnerProfileId: z.string().uuid().optional(),
  successCriteria: z.array(z.string()).optional(),
  requiredSkills: z.array(z.string()).optional(),
  priority: z.number().int().min(1).max(5).optional()
});

export const generateSprintSchema = z.object({
  objectiveId: z.string().uuid(),
  learnerProfileId: z.string().uuid().optional(),
  preferLength: z.number().int().optional(),
  allowedResources: z.array(z.string()).optional()
});
