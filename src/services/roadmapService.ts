import { Prisma } from '@prisma/client';
import { AppError } from '../errors/AppError';
import { quizService } from './quizService';
import { db } from '../prisma/prismaWrapper';
import {
  RoadmapType,
  ObjectiveStatus,
  Roadmap,
  Objective,
  Progress,
  QuizResult,
  SprintStatus,
  SprintDifficulty
} from '../types/prisma';
import { profileContextBuilder } from './profileContextBuilder.js';
import { objectiveService } from './objectiveService.js';

// Re-export enums for use in other files
export { RoadmapType, ObjectiveStatus };

export interface RoadmapGenerationRequest {
  userId: string;
  quizResultId: string;
  roadmapType: RoadmapType;
}

export interface ProgressUpdateRequest {
  userId: string;
  roadmapId: string;
  completedTaskIds: string[];
}

export class RoadmapService {
  // Generate a new roadmap based on quiz results
  async generateRoadmap(request: RoadmapGenerationRequest): Promise<any> {
    // Get the quiz result
    const quizResult = await quizService.getQuizResult(request.quizResultId);
    
    // Check if the quiz result belongs to the requesting user
    if (quizResult.userId !== request.userId) {
      throw new AppError('You do not have permission to use this quiz result', 403);
    }

    const learnerProfileSnapshot = await profileContextBuilder.recordSnapshotFromComputedProfile({
      userId: request.userId,
      computedProfile: quizResult.computedProfile as Record<string, unknown>,
      quizResultId: quizResult.id
    });

    const objectiveSpec = this.buildPrimaryObjectiveSpec(
      quizResult.computedProfile,
      request.roadmapType
    );

    const { objective, sprint, plan } = await objectiveService.createObjective({
      userId: request.userId,
      title: objectiveSpec.title,
      description: objectiveSpec.description,
      learnerProfileId: learnerProfileSnapshot.id,
      successCriteria: objectiveSpec.successCriteria,
      requiredSkills: objectiveSpec.requiredSkills,
      priority: 1,
      roadmapType: request.roadmapType
    });

    const roadmapPlanPayload = {
      version: 'planner.v1',
      plannerVersion: plan.metadata.plannerVersion,
      objective: {
        id: objective.id,
        title: objective.title
      },
      sprint: {
        id: sprint.id,
        lengthDays: sprint.lengthDays,
        totalEstimatedHours: sprint.totalEstimatedHours,
        difficulty: sprint.difficulty,
        metadata: plan.metadata,
        plan: plan.plannerOutput
      }
    };

    const roadmapPlanJson = JSON.parse(JSON.stringify(roadmapPlanPayload)) as Prisma.JsonValue;

    const roadmap = await db.roadmap.create({
      data: {
        userId: request.userId,
        roadmap_type: request.roadmapType,
        profileSnapshot: quizResult.computedProfile,
        jsonRoadmap: roadmapPlanJson,
        objectiveId: objective.id,
        objectives: {
          connect: { id: objective.id }
        }
      }
    });

    await db.objective.update({
      where: { id: objective.id },
      data: {
        roadmapId: roadmap.id,
        primaryRoadmap: {
          connect: { id: roadmap.id }
        }
      }
    });

    await db.progress.create({
      data: {
        userId: request.userId,
        roadmapId: roadmap.id,
        completedTasks: [],
        completedObjectives: 0,
        streak: 0
      }
    });

    const hydratedRoadmap = await db.roadmap.findUnique({
      where: { id: roadmap.id },
      include: {
        objective: true
      }
    });

    return {
      roadmap: hydratedRoadmap,
      learnerProfile: learnerProfileSnapshot,
      initialSprint: {
        ...sprint,
        plan
      }
    };
  }
  
  private ensureStringArray(value: unknown): string[] {
    if (!value) {
      return [];
    }

    if (Array.isArray(value)) {
      return value
        .map((entry) => (typeof entry === 'string' ? entry : typeof entry === 'number' ? String(entry) : null))
        .filter((entry): entry is string => Boolean(entry));
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      return [value.trim()];
    }

    return [];
  }

  private buildPrimaryObjectiveSpec(profile: any, roadmapType: RoadmapType) {
    const normalizedGoal = typeof profile?.goal === 'string'
      ? profile.goal.trim()
      : typeof profile?.primaryGoal === 'string'
        ? profile.primaryGoal.trim()
        : '';
    const passionTags = this.ensureStringArray(profile?.passionTags ?? profile?.passions ?? []);
    const focusArea = passionTags[0];

    const defaultTitle =
      roadmapType === RoadmapType.thirty_day
        ? 'Launch your personalized milestone sprint'
        : 'Kick off your personalized sprint';

    const title = normalizedGoal.length > 0 ? `Move forward on ${normalizedGoal}` : defaultTitle;

    const descriptionParts = [
      'Personalized sprint plan generated from your latest learner profile snapshot.'
    ];

    if (focusArea) {
      descriptionParts.push(`Lean into your interest in ${focusArea} to keep momentum high.`);
    }

    if (normalizedGoal.length > 0) {
      descriptionParts.push(`Deliver tangible progress toward "${normalizedGoal}" and capture evidence along the way.`);
    }

    const successCriteria = [
      'Complete all planner microtasks within the sprint timeline.',
      'Publish portfolio-ready evidence and reflections for mentor review.'
    ];

    if (normalizedGoal.length > 0) {
      successCriteria.push(`Show measurable progress toward "${normalizedGoal}".`);
    }

    const requiredSkills = this.ensureStringArray(profile?.requiredSkills ?? profile?.skills ?? []);

    return {
      title,
      description: descriptionParts.join(' '),
      successCriteria,
      requiredSkills
    };
  }

  async getRoadmap(roadmapId: string, userId: string): Promise<Roadmap> {
    const roadmap = await db.roadmap.findUnique({
      where: { id: roadmapId },
      include: {
        objectives: true,
        progresses: {
          where: { userId }
        }
      }
    });

    if (!roadmap) {
      throw new AppError('Roadmap not found', 404);
    }

    if (roadmap.userId !== userId) {
      throw new AppError('You do not have permission to access this roadmap', 403);
    }

    return roadmap as Roadmap;
  }

  async getUserRoadmaps(userId: string): Promise<Roadmap[]> {
    const roadmaps = await db.roadmap.findMany({
      where: { userId },
      include: {
        objectives: true,
        progresses: {
          where: { userId }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return roadmaps as Roadmap[];
  }

  async updateProgress(request: ProgressUpdateRequest): Promise<any> {
    // Verify the roadmap exists and belongs to the user
    const roadmap = await this.getRoadmap(request.roadmapId, request.userId);
    
    // Get the current progress
    const progress = await db.progress.findUnique({
      where: {
        userId_roadmapId: {
          userId: request.userId,
          roadmapId: request.roadmapId
        }
      }
    });
    
    if (!progress) {
      throw new AppError('Progress record not found', 404);
    }
    
    // Update the progress
    const updatedProgress = await db.progress.update({
      where: {
        id: progress.id
      },
      data: {
        completedTasks: request.completedTaskIds,
        lastActivityAt: new Date()
      }
    });
    
    // Update streak and objectives
    await this.updateStreak(updatedProgress.id);
    await this.updateObjectives(request.roadmapId, request.completedTaskIds);
    
    // Get the fully updated progress with streak
    const finalProgress = await db.progress.findUnique({
      where: { id: updatedProgress.id },
      include: {
        roadmap: {
          include: {
            objectives: true
          }
        }
      }
    });
    
    return finalProgress;
  }
  
  // Update streak based on activity
  private async updateStreak(progressId: string): Promise<any> {
    const progress = await db.progress.findUnique({
      where: { id: progressId }
    });
    
    if (!progress) {
      throw new AppError('Progress not found', 404);
    }
    
    // Check if there was activity in the last 24 hours
    const now = new Date();
    const lastActivity = new Date(progress.lastActivityAt);
    const hoursSinceLastActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
    
    let streak = progress.streak;
    
    // If it's been more than 48 hours since last activity, reset streak
    if (hoursSinceLastActivity > 48) {
      streak = 1; // Reset to 1 for today's activity
    } 
    // If it's been between 24-48 hours, increment streak
    else if (hoursSinceLastActivity > 24) {
      streak += 1;
    }
    // If less than 24 hours, keep the streak (already counted for today)
    
    // Update the streak
    return await db.progress.update({
      where: { id: progressId },
      data: { streak }
    });
  }
  
  // Update objectives based on completed tasks
  private async updateObjectives(roadmapId: string, completedTaskIds: string[]): Promise<void> {
    // Get the roadmap with its objectives
    const roadmap = await db.roadmap.findUnique({
      where: { id: roadmapId },
      include: { objectives: true }
    });
    
    if (!roadmap) {
      throw new AppError('Roadmap not found', 404);
    }
    
    // Get the roadmap content
    const jsonRoadmap = roadmap.jsonRoadmap as any;
    const days = jsonRoadmap.days || [];
    
    // Calculate total tasks and completed tasks
    let totalTasks = 0;
    days.forEach((day: any) => {
      totalTasks += day.tasks.length;
    });
    
    const completionPercentage = totalTasks > 0 ? (completedTaskIds.length / totalTasks) * 100 : 0;
    
    // Update objectives based on completion percentage
    for (const objective of roadmap.objectives) {
      let newStatus = objective.status;

      const completionTargets: Array<{ match: (title: string) => boolean; threshold: number }> = [
        { match: (title) => title.includes('Day 1-2'), threshold: 20 },
        { match: (title) => title.includes('Day 3-5'), threshold: 50 },
        { match: (title) => title.includes('Week 1'), threshold: 25 },
        { match: (title) => title.includes('Week 2'), threshold: 50 },
        { match: (title) => title.includes('Week 3'), threshold: 75 },
        { match: (title) => title.includes('all 7-day') || title.includes('all 30-day'), threshold: 90 }
      ];

      const matchedTarget = completionTargets.find(({ match }) => match(objective.title));

      if (matchedTarget && completionPercentage >= matchedTarget.threshold) {
        newStatus = ObjectiveStatus.completed;
      } else if (completionPercentage > 0) {
        newStatus = ObjectiveStatus.active;
      } else {
        newStatus = ObjectiveStatus.draft;
      }

      // normalize legacy statuses to new enum values
      if (newStatus === ObjectiveStatus.todo || newStatus === ObjectiveStatus.doing) {
        newStatus = completionPercentage > 0 ? ObjectiveStatus.active : ObjectiveStatus.draft;
      }
      if (newStatus === ObjectiveStatus.done) {
        newStatus = ObjectiveStatus.completed;
      }

      // Update the objective if status changed
      if (newStatus !== objective.status) {
        await db.objective.update({
          where: { id: objective.id },
          data: { status: newStatus }
        });
        objective.status = newStatus;
      }
    }

    // Count completed objectives
    const completedObjectives = roadmap.objectives.filter(
      (obj: any) => obj.status === ObjectiveStatus.completed || obj.status === ObjectiveStatus.done
    ).length;
    
    // Update the progress record with completed objectives count
    await db.progress.updateMany({
      where: { roadmapId },
      data: { completedObjectives }
    });
  }
}

export const roadmapService = new RoadmapService();
