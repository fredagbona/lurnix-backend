import { z } from 'zod';

// Basic schemas
export const RoadmapResourceSchema = z.object({
  label: z.string(),
  url: z.string().url()
});

export const RoadmapTaskSchema = z.object({
  id: z.string(),
  type: z.enum(['read', 'watch', 'code', 'quiz', 'reflect', 'project']),
  title: z.string(),
  estMins: z.number().int().min(10).max(120),
  difficulty: z.enum(['intro', 'core', 'stretch', 'beginner', 'intermediate', 'advanced']),
  acceptance: z.array(z.string()).min(1),
  resources: z.array(RoadmapResourceSchema).min(1)
});

export const RoadmapDaySchema = z.object({
  day: z.number().int().min(1),
  focus: z.string(),
  tasks: z.array(RoadmapTaskSchema).min(2).max(5),
  checkpoints: z.array(z.string()).optional()
});

export const RoadmapSchema = z.object({
  version: z.literal(1),
  title: z.string(),
  stack: z.array(z.string()).nonempty(),
  roadmapType: z.enum(['seven_day', 'thirty_day']),
  estDailyMins: z.number().int().min(25).max(90),
  principles: z.array(z.string()).nonempty(),
  days: z.array(RoadmapDaySchema)
    .refine(days => {
      // For seven_day roadmap, ensure exactly 7 days
      if (days.length === 7) {
        return true;
      }
      // For thirty_day roadmap, ensure exactly 30 days
      if (days.length === 30) {
        return true;
      }
      return false;
    }, {
      message: "Roadmap must have exactly 7 or 30 days depending on roadmapType"
    })
});

// Request validation schemas
export const GenerateSevenDayRoadmapRequestSchema = z.object({
  userId: z.string().uuid(),
  learningStyle: z.object({
    primary: z.string(),
    secondary: z.string()
  }),
  objectives: z.object({
    topGoal: z.string(),
    priorityRank: z.array(z.string()),
    timeHorizon: z.string().optional()
  }),
  passions: z.object({
    ranked: z.array(z.string()),
    notes: z.string().optional()
  }),
  problemSolving: z.object({
    debugStyle: z.string(),
    collaboration: z.string()
  }),
  timeCommitmentMinsPerDay: z.number().int().min(15).max(180).optional(),
  priorExperience: z.string().optional()
});

export const GenerateThirtyDayRoadmapRequestSchema = z.object({
  userId: z.string().uuid(),
  learningStyle: z.object({
    primary: z.string(),
    secondary: z.string()
  }),
  objectives: z.object({
    topGoal: z.string(),
    priorityRank: z.array(z.string()),
    timeHorizon: z.string().optional()
  }),
  passions: z.object({
    ranked: z.array(z.string()),
    notes: z.string().optional()
  }),
  problemSolving: z.object({
    debugStyle: z.string(),
    collaboration: z.string()
  }),
  timeCommitmentMinsPerDay: z.number().int().min(15).max(180).optional(),
  priorExperience: z.string().optional(),
  projectThemes: z.array(z.string()).optional()
});
