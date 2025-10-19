import { z } from 'zod';
import { FeatureCategory, FeatureStatus } from '@prisma/client';

const tagsInputSchema = z
  .union([
    z.array(z.string()),
    z.string(),
  ])
  .transform(value => {
    if (Array.isArray(value)) {
      return value.reduce<string[]>((acc, current) => {
        if (typeof current === 'string' && current.trim().length > 0) {
          acc.push(...current.split(',').map(item => item.trim()).filter(Boolean));
        }
        return acc;
      }, []);
    }

    return value
      .split(',')
      .map(item => item.trim())
      .filter(Boolean);
  });

export const featureListQuerySchema = z.object({
  status: z.nativeEnum(FeatureStatus).optional(),
  category: z.nativeEnum(FeatureCategory).optional(),
  sort: z.enum(['top', 'new', 'trending']).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  cursor: z
    .string()
    .regex(/^\d+$/)
    .optional(),
  q: z.string().min(2).optional(),
  tags: tagsInputSchema.optional(),
});

export const featureCreateSchema = z.object({
  title: z.string().trim().min(6).max(100),
  description: z.string().trim().min(20).max(1000),
  category: z.nativeEnum(FeatureCategory),
  tags: z.array(z.string().trim().min(1)).max(10).optional(),
});

export const featureUpdateSchema = z
  .object({
    title: z.string().trim().min(6).max(100).optional(),
    description: z.string().trim().min(20).max(1000).optional(),
    category: z.nativeEnum(FeatureCategory).optional(),
    status: z.nativeEnum(FeatureStatus).optional(),
    tags: z.array(z.string().trim().min(1)).max(10).optional(),
    mergedIntoId: z.string().regex(/^\d+$/).nullable().optional(),
  })
  .refine(
    payload => Object.keys(payload).length > 0,
    'At least one field must be provided for update'
  );

export const featureMergeSchema = z.object({
  targetId: z.string().regex(/^\d+$/),
  closeWithStatus: z.nativeEnum(FeatureStatus).optional(),
});

export const featureModNoteSchema = z.object({
  note: z.string().trim().min(3).max(1000),
});

export const featureIdParamSchema = z.object({
  id: z.string().regex(/^\d+$/),
});

export const featureAdminNoteIdParamSchema = featureIdParamSchema;
