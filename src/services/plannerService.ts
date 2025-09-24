import { z } from 'zod';
import { LearnerProfile, SprintDifficulty } from '../types/prisma';
import { PlannerRequestPayload, requestPlannerPlan } from './plannerClient.js';
import { ProfileContext } from './profileContextBuilder.js';
import { config } from '../config/environment.js';

export interface GenerateSprintPlanInput {
  objectiveId: string;
  objectiveTitle: string;
  objectiveDescription?: string | null;
  successCriteria?: string[];
  requiredSkills?: string[];
  learnerProfile?: LearnerProfile | null;
  preferLength?: number;
  profileContext?: ProfileContext;
  plannerVersion?: string;
  requestedAt?: Date;
  objectivePriority?: number;
  objectiveStatus?: string;
}

export interface SprintProjectPlan {
  id: string;
  title: string;
  brief: string;
  requirements: string[];
  acceptanceCriteria: string[];
  deliverables: {
    type: 'repository' | 'deployment' | 'video' | 'screenshot';
    title: string;
    artifactId: string;
  }[];
  evidenceRubric: {
    dimensions: { name: string; weight: number; levels?: string[] }[];
    passThreshold: number;
  };
  checkpoints?: { id: string; title: string; type: 'assessment' | 'quiz' | 'demo'; spec: string }[];
  support?: {
    concepts?: { id: string; title: string; summary: string }[];
    practiceKatas?: { id: string; title: string; estimateMin: number }[];
    allowedResources?: string[];
  };
  reflection?: { prompt: string; moodCheck?: boolean };
}

export interface SprintMicroTaskPlan {
  id: string;
  projectId: string;
  title: string;
  type: 'concept' | 'practice' | 'project' | 'assessment' | 'reflection';
  estimatedMinutes: number;
  instructions: string;
  acceptanceTest: { type: 'checklist' | 'unit_tests' | 'quiz' | 'demo'; spec: string | string[] };
  resources?: string[];
}

const sprintPlanCoreSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(3),
  description: z.string().min(5),
  lengthDays: z.union([z.literal(3), z.literal(7), z.literal(14)]),
  totalEstimatedHours: z.number().min(1),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  projects: z.array(z.object({
    id: z.string(),
    title: z.string(),
    brief: z.string(),
    requirements: z.array(z.string()).min(1),
    acceptanceCriteria: z.array(z.string()).min(1),
    deliverables: z.array(z.object({
      type: z.enum(['repository', 'deployment', 'video', 'screenshot']),
      title: z.string(),
      artifactId: z.string()
    })).min(1),
    evidenceRubric: z.object({
      dimensions: z.array(z.object({
        name: z.string(),
        weight: z.number().min(0).max(1),
        levels: z.array(z.string()).optional()
      })).min(1),
      passThreshold: z.number().min(0).max(1)
    }),
    checkpoints: z.array(z.object({
      id: z.string(),
      title: z.string(),
      type: z.enum(['assessment', 'quiz', 'demo']),
      spec: z.string()
    })).optional(),
    support: z.object({
      concepts: z.array(z.object({ id: z.string(), title: z.string(), summary: z.string() })).optional(),
      practiceKatas: z.array(z.object({ id: z.string(), title: z.string(), estimateMin: z.number().min(5) })).optional(),
      allowedResources: z.array(z.string()).optional()
    }).optional(),
    reflection: z.object({ prompt: z.string(), moodCheck: z.boolean().optional() }).optional()
  })).min(1),
  microTasks: z.array(z.object({
    id: z.string(),
    projectId: z.string(),
    title: z.string(),
    type: z.enum(['concept', 'practice', 'project', 'assessment', 'reflection']),
    estimatedMinutes: z.number().min(15).max(180),
    instructions: z.string(),
    acceptanceTest: z.object({
      type: z.enum(['checklist', 'unit_tests', 'quiz', 'demo']),
      spec: z.union([z.string(), z.array(z.string()).min(1)])
    }),
    resources: z.array(z.string()).optional()
  })).min(3),
  portfolioCards: z.array(z.object({
    projectId: z.string(),
    cover: z.string().optional(),
    headline: z.string(),
    badges: z.array(z.string()).optional(),
    links: z.object({
      repo: z.string().optional(),
      demo: z.string().optional(),
      video: z.string().optional()
    }).optional()
  })).optional(),
  adaptationNotes: z.string().min(5)
});

export type SprintPlanCore = z.infer<typeof sprintPlanCoreSchema>;

export interface PlannerPlanMetadata {
  plannerVersion: string;
  requestedAt: string;
  provider: 'remote' | 'fallback';
  objectiveId: string;
  learnerProfileId?: string | null;
  preferLength?: number | null;
}

interface PlannerPlanMetadataInput {
  plannerVersion: string;
  requestedAt: Date;
  provider: 'remote' | 'fallback';
  objectiveId: string;
  learnerProfileId?: string | null;
  preferLength?: number | null;
}

export interface SprintPlan extends SprintPlanCore {
  plannerOutput: Record<string, unknown>;
  metadata: PlannerPlanMetadata;
}

class PlannerService {
  async generateSprintPlan(input: GenerateSprintPlanInput): Promise<SprintPlan> {
    const requestedAt = input.requestedAt ?? new Date();
    const plannerVersion = input.plannerVersion ?? config.PLANNER_VERSION ?? 'unversioned';
    const planId = this.buildPlanId(input.objectiveId, requestedAt);

    try {
      const remotePlan = await requestPlannerPlan(
        this.buildPlannerPayload(input, plannerVersion, requestedAt, planId)
      );
      const corePlan = this.validateRemotePlan(remotePlan, input, planId);
      const metadata = this.buildPlanMetadata({
        plannerVersion,
        requestedAt,
        provider: 'remote',
        objectiveId: input.objectiveId,
        learnerProfileId: input.learnerProfile?.id ?? null,
        preferLength: input.preferLength ?? null
      });
      return {
        ...corePlan,
        id: planId,
        plannerOutput: this.enrichPlannerOutput(remotePlan, metadata, input.profileContext),
        metadata
      };
    } catch (error) {
      console.error('[plannerService] Remote planner unavailable, falling back to heuristic plan:', error);
      return this.buildFallbackPlan(input, planId, requestedAt, plannerVersion);
    }
  }

  private validateRemotePlan(rawPlan: unknown, input: GenerateSprintPlanInput, planId: string): SprintPlanCore {
    const parsed = sprintPlanCoreSchema.safeParse(rawPlan);
    if (!parsed.success) {
      throw new Error(parsed.error.message);
    }

    const plan = parsed.data;
    plan.id = planId;

    return plan;
  }

  private buildPlannerPayload(
    input: GenerateSprintPlanInput,
    plannerVersion: string,
    requestedAt: Date,
    planId: string
  ): PlannerRequestPayload {
    const profileContext = input.profileContext
      ? JSON.parse(JSON.stringify(input.profileContext))
      : null;

    return {
      objective: {
        id: input.objectiveId,
        title: input.objectiveTitle,
        description: input.objectiveDescription ?? null,
        successCriteria: input.successCriteria ?? [],
        requiredSkills: input.requiredSkills ?? [],
        priority: input.objectivePriority ?? null,
        status: input.objectiveStatus ?? null
      },
      learnerProfile: input.learnerProfile
        ? {
            id: input.learnerProfile.id,
            hoursPerWeek: input.learnerProfile.hoursPerWeek ?? null,
            strengths: input.learnerProfile.strengths ?? [],
            gaps: input.learnerProfile.gaps ?? [],
            passionTags: input.learnerProfile.passionTags ?? [],
            blockers: input.learnerProfile.blockers ?? [],
            goals: input.learnerProfile.goals ?? []
          }
        : null,
      preferLength: input.preferLength,
      context: {
        plannerVersion,
        requestedAt: requestedAt.toISOString(),
        planId,
        profileContext
      }
    };
  }

  private buildFallbackPlan(
    input: GenerateSprintPlanInput,
    planId: string,
    requestedAt: Date,
    plannerVersion: string
  ): SprintPlan {
    const lengthDays = this.resolveFallbackLength(input);
    const totalEstimatedHours = this.resolveFallbackHours(input, lengthDays);
    const difficulty = this.resolveFallbackDifficulty(input);

    const projectId = `${planId}_project`;
    const projects = this.buildFallbackProjects(planId, projectId, input, difficulty);
    const microTasks = this.buildFallbackMicroTasks(planId, projectId, input, lengthDays);
    const portfolioCards = this.buildFallbackPortfolioCards(projectId, input);
    const adaptationNotes = this.buildAdaptationNotes(input);

    const metadata = this.buildPlanMetadata({
      plannerVersion,
      requestedAt,
      provider: 'fallback',
      objectiveId: input.objectiveId,
      learnerProfileId: input.learnerProfile?.id ?? null,
      preferLength: input.preferLength ?? null
    });

    const plannerOutput: Record<string, unknown> = {
      provider: 'fallback',
      generatedAt: requestedAt.toISOString(),
      plannerVersion,
      planId,
      profileContext: input.profileContext ?? null,
      projects,
      microTasks,
      portfolioCards,
      adaptationNotes,
      metadata
    };

    return {
      id: planId,
      title: `${input.objectiveTitle} — Sprint`,
      description: input.objectiveDescription ?? `Sprint focusing on ${input.objectiveTitle}.`,
      lengthDays,
      totalEstimatedHours,
      difficulty,
      projects,
      microTasks,
      portfolioCards,
      adaptationNotes,
      plannerOutput,
      metadata
    };
  }

  private buildPlanId(objectiveId: string, requestedAt: Date): string {
    const timestamp = requestedAt.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    return `spr_${objectiveId}_${timestamp}`;
  }

  private buildPlanMetadata(params: PlannerPlanMetadataInput): PlannerPlanMetadata {
    return {
      plannerVersion: params.plannerVersion,
      requestedAt: params.requestedAt.toISOString(),
      provider: params.provider,
      objectiveId: params.objectiveId,
      learnerProfileId: params.learnerProfileId ?? null,
      preferLength: params.preferLength ?? null
    };
  }

  private enrichPlannerOutput(
    rawPlan: unknown,
    metadata: PlannerPlanMetadata,
    profileContext?: ProfileContext
  ): Record<string, unknown> {
    const payload = this.deepClone(rawPlan);
    payload.metadata = metadata;
    if (profileContext) {
      payload.profileContext = profileContext;
    }
    return payload;
  }

  private deepClone(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object') {
      return {};
    }

    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      console.warn('[plannerService] Failed to clone planner payload, returning shallow copy');
      return {};
    }
  }

  private resolveFallbackLength(input: GenerateSprintPlanInput): 3 | 7 | 14 {
    if (input.preferLength && [3, 7, 14].includes(input.preferLength)) {
      return input.preferLength as 3 | 7 | 14;
    }
    const hoursPerWeek = input.learnerProfile?.hoursPerWeek;
    if (hoursPerWeek && hoursPerWeek < 8) return 14;
    if (hoursPerWeek && hoursPerWeek <= 15) return 7;
    return 3;
  }

  private resolveFallbackHours(input: GenerateSprintPlanInput, lengthDays: 3 | 7 | 14): number {
    const hoursPerWeek = input.learnerProfile?.hoursPerWeek;
    if (hoursPerWeek && hoursPerWeek > 0) {
      const hoursPerDay = hoursPerWeek / 7;
      return Math.round(hoursPerDay * lengthDays * 10) / 10;
    }
    const defaultHoursPerDay = lengthDays === 3 ? 3 : 2;
    return Math.round(defaultHoursPerDay * lengthDays * 10) / 10;
  }

  private resolveFallbackDifficulty(input: GenerateSprintPlanInput): SprintDifficulty {
    const profile = input.learnerProfile;
    const strengths = profile?.strengths ?? [];
    const requiredSkills = input.requiredSkills ?? [];
    const hasMatchingStrength = requiredSkills.some((skill) =>
      strengths.map((s) => s.toLowerCase()).includes(skill.toLowerCase())
    );

    if (!hasMatchingStrength && (profile?.gaps?.length ?? 0) > 0) {
      return SprintDifficulty.beginner;
    }
    if (profile?.hoursPerWeek && profile.hoursPerWeek > 20) {
      return SprintDifficulty.advanced;
    }
    return SprintDifficulty.intermediate;
  }

  private buildFallbackProjects(
    planId: string,
    projectId: string,
    input: GenerateSprintPlanInput,
    difficulty: SprintDifficulty
  ): SprintProjectPlan[] {
    const acceptanceCriteria = input.successCriteria?.slice(0, 3) ?? [
      'Submit code repository',
      'Record demo or screenshots',
      'Write sprint retrospective'
    ];

    const project: SprintProjectPlan = {
      id: projectId,
      title: `${input.objectiveTitle} project`,
      brief: input.objectiveDescription ?? `Ship a tangible artifact for ${input.objectiveTitle}.`,
      requirements: [
        'Follow accessible and inclusive best practices',
        'Document project decisions in README',
        `Highlight how this work contributes to ${input.objectiveTitle}`
      ],
      acceptanceCriteria,
      deliverables: [
        { type: 'repository', title: 'Repository link', artifactId: `${projectId}_repo` },
        { type: 'deployment', title: 'Demo link', artifactId: `${projectId}_demo` }
      ],
      evidenceRubric: {
        dimensions: [
          { name: 'Fonctionnalité', weight: 0.4 },
          { name: 'Qualité du code', weight: 0.25 },
          { name: 'Expérience utilisateur', weight: 0.2 },
          { name: 'Documentation', weight: 0.15 }
        ],
        passThreshold: 0.7
      },
      checkpoints: [
        {
          id: `${planId}_checkpoint_review`,
          title: 'Mid-sprint review',
          type: 'demo',
          spec: 'Walk through core functionality and capture blockers.'
        }
      ],
      support: {
        concepts: [
          {
            id: `${planId}_concept_scope`,
            title: 'Scope definition',
            summary: 'Clarify MVP vs stretch tasks before starting.'
          }
        ],
        practiceKatas: [
          {
            id: `${planId}_kata_tests`,
            title: 'Write smoke tests for critical flows',
            estimateMin: 30
          }
        ]
      },
      reflection: {
        prompt: 'What did this sprint change about your understanding of the objective?',
        moodCheck: true
      }
    };

    if (difficulty === SprintDifficulty.beginner) {
      project.requirements.push('Include learning journal notes in repository.');
    }

    return [project];
  }

  private buildFallbackMicroTasks(
    planId: string,
    projectId: string,
    input: GenerateSprintPlanInput,
    lengthDays: 3 | 7 | 14
  ): SprintMicroTaskPlan[] {
    const baseTasks = [
      {
        title: `Frame the sprint for ${input.objectiveTitle}`,
        instructions: `Capture key outcomes you aim to achieve for ${input.objectiveTitle}. Share blockers or open questions.`
      },
      {
        title: `Build core deliverable for ${input.objectiveTitle}`,
        instructions: 'Implement the main functionality and document tradeoffs in the README.'
      },
      {
        title: 'Evidence & reflection package',
        instructions: 'Record a quick demo, collect links/screenshots, and note learning takeaways.'
      }
    ];

    const estimatedMinutes = lengthDays <= 3 ? 90 : 60;

    return baseTasks.map((task, idx) => ({
      id: `${planId}_task_${idx + 1}`,
      projectId,
      title: task.title,
      type: idx === baseTasks.length - 1 ? 'reflection' : 'project',
      estimatedMinutes,
      instructions: task.instructions,
      acceptanceTest: {
        type: 'checklist',
        spec: [
          'Document progress with screenshots or notes',
          'List blockers and mitigation plan',
          'Attach supporting evidence links'
        ]
      }
    }));
  }

  private buildFallbackPortfolioCards(projectId: string, input: GenerateSprintPlanInput) {
    return [
      {
        projectId,
        headline: `Showcase: ${input.objectiveTitle}`,
        badges: input.requiredSkills?.slice(0, 3) ?? [],
        links: {}
      }
    ];
  }

  private buildAdaptationNotes(input: GenerateSprintPlanInput): string {
    const strengths = input.learnerProfile?.strengths ?? [];
    const gaps = input.learnerProfile?.gaps ?? [];

    const notes: string[] = [];

    if (gaps.length > 0) {
      notes.push('Insert refresher resources for learner gaps before core tasks.');
    }

    if (strengths.includes('collaboration')) {
      notes.push('Encourage pair or community review midway through the sprint.');
    }

    if (input.profileContext?.progress?.streak && input.profileContext.progress.streak > 3) {
      notes.push('Sustain momentum with a stretch checkpoint on day 3.');
    }

    if (input.profileContext?.progress?.completedTasks === 0) {
      notes.push('Start with a quick win task to build confidence before tackling core work.');
    }

    if (notes.length === 0) {
      notes.push('Review progress every two days to adjust scope if needed.');
    }

    return notes.join(' ');
  }
}

export const plannerService = new PlannerService();
