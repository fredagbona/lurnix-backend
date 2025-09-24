import { z } from 'zod';
import { ArtifactStatus, ArtifactType } from '../types/prisma.js';

const artifactStatusEnum = z.nativeEnum(ArtifactStatus);
const artifactTypeEnum = z.nativeEnum(ArtifactType);

export const submitSprintEvidenceSchema = z.object({
  objectiveId: z.string().uuid(),
  sprintId: z.string().uuid(),
  artifacts: z
    .array(
      z.object({
        artifactId: z.string().min(1),
        projectId: z.string().min(1),
        type: artifactTypeEnum,
        title: z.string().min(1).optional(),
        url: z.string().url().optional(),
        status: artifactStatusEnum.optional(),
        notes: z.string().optional()
      })
    )
    .min(1),
  selfEvaluation: z
    .object({
      confidence: z.number().min(0).max(10).optional(),
      reflection: z.string().max(2000).optional()
    })
    .optional(),
  markSubmitted: z.boolean().optional()
});

export const reviewSprintSchema = z.object({
  objectiveId: z.string().uuid(),
  sprintId: z.string().uuid()
});
