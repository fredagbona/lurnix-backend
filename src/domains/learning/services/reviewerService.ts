import { requestReviewAssessment } from './reviewerClient.js';
import {
  ReviewInput,
  ReviewOutput,
  ReviewerProjectSummary,
  ReviewerSummary,
  zReviewOutput
} from '../../../types/reviewer.js';
import { ArtifactStatus, SprintArtifact } from '@prisma/client';

export interface ReviewSprintParams {
  projects: Record<string, unknown>[];
  artifacts: SprintArtifact[];
  selfEvaluation?: { confidence?: number | null; reflection?: string | null } | null;
}

export interface ReviewSprintResult {
  summary: ReviewerSummary;
  projectProviders: { projectId: string; provider: 'remote' | 'fallback' }[];
}

class ReviewerService {
  async reviewSprint(params: ReviewSprintParams): Promise<ReviewSprintResult> {
    const projectSummaries: ReviewerProjectSummary[] = [];
    const providers: { projectId: string; provider: 'remote' | 'fallback' }[] = [];

    for (const project of params.projects) {
      const projectId = this.resolveProjectId(project);
      const projectTitle = this.resolveProjectTitle(project);
      const projectArtifacts = params.artifacts.filter((artifact) => artifact.projectId === projectId);

      const reviewInput = this.buildReviewInput(project, projectArtifacts, params.selfEvaluation);

      const { review, provider } = await this.executeReview(reviewInput, projectArtifacts);

      projectSummaries.push({ projectId, projectTitle, review });
      providers.push({ projectId, provider });
    }

    const overall = this.aggregateOverall(projectSummaries);
    const reviewedAt = new Date().toISOString();
    const providerLabel = this.resolveProviderLabel(providers);

    const metadata: Record<string, unknown> = {
      provider: providerLabel,
      projects: providers
    };

    return {
      summary: {
        reviewedAt,
        overall,
        projects: projectSummaries,
        metadata
      },
      projectProviders: providers
    };
  }

  private resolveProjectId(project: Record<string, unknown>): string {
    const value = project.id;
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
    return `project_${Math.random().toString(36).slice(2, 10)}`;
  }

  private resolveProjectTitle(project: Record<string, unknown>): string | undefined {
    const value = project.title;
    return typeof value === 'string' ? value : undefined;
  }

  private buildReviewInput(
    project: Record<string, unknown>,
    artifacts: SprintArtifact[],
    selfEvaluation?: { confidence?: number | null; reflection?: string | null } | null
  ): ReviewInput {
    const artifactPayloads = artifacts.map((artifact) => ({
      type: artifact.type,
      url: artifact.url ?? undefined,
      status: this.mapArtifactStatus(artifact.status),
      notes: artifact.notes ?? undefined
    }));

    const trimmedSelfEvaluation = selfEvaluation
      ? this.normalizeSelfEvaluation(selfEvaluation)
      : undefined;

    return {
      project,
      artifacts: artifactPayloads,
      selfEvaluation: trimmedSelfEvaluation
    };
  }

  private mapArtifactStatus(
    status: ArtifactStatus
  ): 'ok' | 'broken' | 'missing' | undefined {
    switch (status) {
      case ArtifactStatus.ok:
        return 'ok';
      case ArtifactStatus.broken:
        return 'broken';
      case ArtifactStatus.missing:
        return 'missing';
      default:
        return undefined;
    }
  }

  private normalizeSelfEvaluation(
    selfEvaluation: { confidence?: number | null; reflection?: string | null }
  ) {
    const payload: { confidence?: number; reflection?: string } = {};
    if (typeof selfEvaluation.confidence === 'number' && !Number.isNaN(selfEvaluation.confidence)) {
      payload.confidence = selfEvaluation.confidence;
    }
    if (typeof selfEvaluation.reflection === 'string' && selfEvaluation.reflection.trim().length > 0) {
      payload.reflection = selfEvaluation.reflection.trim();
    }
    return Object.keys(payload).length > 0 ? payload : undefined;
  }

  private async executeReview(
    reviewInput: ReviewInput,
    artifacts: SprintArtifact[]
  ): Promise<{ review: ReviewOutput; provider: 'remote' | 'fallback' }> {
    try {
      const raw = await requestReviewAssessment(reviewInput);
      const parsed = zReviewOutput.parse(raw);
      return { review: parsed, provider: 'remote' };
    } catch (error) {
      console.warn('[reviewerService] Reviewer call failed, falling back to heuristics', error);
      return { review: this.buildFallbackReview(reviewInput, artifacts), provider: 'fallback' };
    }
  }

  private buildFallbackReview(input: ReviewInput, artifacts: SprintArtifact[]): ReviewOutput {
    const okArtifacts = artifacts.filter((artifact) => artifact.status === ArtifactStatus.ok);
    const totalArtifacts = artifacts.length;
    const artifactScore = totalArtifacts === 0 ? 0 : okArtifacts.length / totalArtifacts;

    const confidence = typeof input.selfEvaluation?.confidence === 'number' ? input.selfEvaluation.confidence : null;
    const confidenceScore = confidence !== null ? Math.max(0, Math.min(1, confidence / 10)) : 0.5;

    const baseScore = 0.2;
    let score = baseScore + artifactScore * 0.6 + confidenceScore * 0.2;
    score = Math.max(0, Math.min(1, score));

    const deliverables = this.extractDeliverables(input.project);
    const achieved: string[] = [];
    const missing: string[] = [];

    for (const deliverable of deliverables) {
      const hasArtifact = artifacts.some((artifact) => artifact.artifactId === deliverable.artifactId);
      if (hasArtifact) {
        achieved.push(`Deliverable met: ${deliverable.title}`);
      } else {
        missing.push(`Add deliverable: ${deliverable.title}`);
      }
    }

    const nextRecommendations = this.buildFallbackRecommendations(missing, artifacts);

    return {
      score,
      achieved,
      missing,
      nextRecommendations,
      pass: score >= 0.7
    };
  }

  private extractDeliverables(project: Record<string, unknown>): { artifactId: string; title: string }[] {
    const deliverablesRaw = project.deliverables;
    if (!Array.isArray(deliverablesRaw)) {
      return [];
    }

    return (deliverablesRaw as Record<string, unknown>[])
      .map((item) => {
        const artifactId = typeof item.artifactId === 'string' ? item.artifactId : null;
        if (!artifactId) {
          return null;
        }
        const title = typeof item.title === 'string' ? item.title : artifactId;
        return { artifactId, title };
      })
      .filter((item): item is { artifactId: string; title: string } => Boolean(item));
  }

  private buildFallbackRecommendations(missing: string[], artifacts: SprintArtifact[]): string[] {
    const recommendations = new Set<string>();

    if (missing.length > 0) {
      missing.forEach((item) => recommendations.add(item));
    }

    const hasDocumentation = artifacts.some((artifact) =>
      (artifact.notes && artifact.notes.toLowerCase().includes('readme')) ||
      (artifact.title && artifact.title.toLowerCase().includes('readme'))
    );

    if (!hasDocumentation) {
      recommendations.add('Document the work with a README or summary.');
    }

    if (recommendations.size === 0) {
      recommendations.add('Ship a short demo video and note improvements for the next sprint.');
    }

    return Array.from(recommendations);
  }

  private aggregateOverall(projectSummaries: ReviewerProjectSummary[]): ReviewOutput {
    if (projectSummaries.length === 0) {
      return {
        score: 0,
        achieved: [],
        missing: ['No projects were reviewed.'],
        nextRecommendations: ['Submit sprint evidence to receive feedback.'],
        pass: false
      };
    }

    const totalScore = projectSummaries.reduce((sum, entry) => sum + entry.review.score, 0);
    const averageScore = totalScore / projectSummaries.length;
    const achieved = this.dedupeStrings(projectSummaries.flatMap((entry) => entry.review.achieved));
    const missing = this.dedupeStrings(projectSummaries.flatMap((entry) => entry.review.missing));
    const recommendations = this.dedupeStrings(
      projectSummaries.flatMap((entry) => entry.review.nextRecommendations)
    );

    return {
      score: Math.max(0, Math.min(1, averageScore)),
      achieved,
      missing,
      nextRecommendations: recommendations.length > 0 ? recommendations : ['Plan the next sprint to extend your portfolio.'],
      pass: projectSummaries.every((entry) => entry.review.pass)
    };
  }

  private dedupeStrings(values: string[]): string[] {
    return Array.from(new Set(values.filter((value) => typeof value === 'string' && value.trim().length > 0)));
  }

  private resolveProviderLabel(providers: { projectId: string; provider: 'remote' | 'fallback' }[]): string {
    if (providers.every((entry) => entry.provider === 'remote')) {
      return 'remote';
    }
    if (providers.every((entry) => entry.provider === 'fallback')) {
      return 'fallback';
    }
    return 'mixed';
  }
}

export const reviewerService = new ReviewerService();
