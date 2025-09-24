import { z } from 'zod';

export type ReviewArtifactInput = {
  type: 'repository' | 'deployment' | 'video' | 'screenshot';
  url?: string;
  status?: 'ok' | 'broken' | 'missing';
  notes?: string;
};

export type ReviewInput = {
  project: Record<string, unknown>;
  artifacts: ReviewArtifactInput[];
  selfEvaluation?: { confidence?: number; reflection?: string } | null;
};

export type ReviewOutput = {
  score: number;
  achieved: string[];
  missing: string[];
  nextRecommendations: string[];
  pass: boolean;
};

export const zReviewOutput = z.object({
  score: z.number().min(0).max(1),
  achieved: z.array(z.string()),
  missing: z.array(z.string()),
  nextRecommendations: z.array(z.string()).min(1),
  pass: z.boolean()
});

export interface ReviewerProjectSummary {
  projectId: string;
  projectTitle?: string;
  review: ReviewOutput;
}

export interface ReviewerSummary {
  reviewedAt: string;
  overall: ReviewOutput;
  projects: ReviewerProjectSummary[];
  metadata?: Record<string, unknown>;
}

export const zReviewerSummary = z.object({
  reviewedAt: z.string(),
  overall: zReviewOutput,
  projects: z.array(
    z.object({
      projectId: z.string(),
      projectTitle: z.string().optional(),
      review: zReviewOutput
    })
  ),
  metadata: z.record(z.any()).optional()
});
