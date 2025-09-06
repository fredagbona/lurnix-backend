import { z } from 'zod';
import { RoadmapType } from '../services/roadmapService';

export const roadmapGenerationSchema = z.object({
  quizResultId: z.string().uuid(),
  roadmapType: z.nativeEnum(RoadmapType)
});

export const progressUpdateSchema = z.object({
  completedTasks: z.array(z.string())
});

export type RoadmapGenerationSchema = z.infer<typeof roadmapGenerationSchema>;
export type ProgressUpdateSchema = z.infer<typeof progressUpdateSchema>;
