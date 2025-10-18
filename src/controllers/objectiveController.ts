import { Request, Response, NextFunction } from 'express';
import { createObjectiveSchema, expandSprintSchema, generateSprintSchema } from '../validation/objectiveSchemas.js';
import { submitSprintEvidenceSchema, reviewSprintSchema } from '../validation/reviewerSchemas.js';
import { objectiveService } from '../services/objectiveService.js';
import { sprintAutoGenerationService } from '../services/sprintAutoGenerationService.js';
import { AuthRequest } from '../middlewares/authMiddleware';
import { sendTranslatedResponse } from '../utils/translationUtils.js';

export class ObjectiveController {
  async listObjectives(req: AuthRequest, res: Response): Promise<void> {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const objectives = await objectiveService.listObjectives(req.userId);

    sendTranslatedResponse(res, 'objectives.list.success', {
      statusCode: 200,
      data: objectives
    });
  }

  async getObjective(req: AuthRequest, res: Response): Promise<void> {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const detail = await objectiveService.getObjective(req.userId, req.params.objectiveId);

    sendTranslatedResponse(res, 'objectives.detail.success', {
      statusCode: 200,
      data: detail
    });
  }

  async createObjective(req: AuthRequest, res: Response, _next: NextFunction): Promise<void> {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const validation = createObjectiveSchema.safeParse(req.body);
    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_OBJECTIVE_PAYLOAD',
          message: validation.error.message
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const result = await objectiveService.createObjective({
      userId: req.userId,
      title: validation.data.title,
      description: validation.data.description,
      learnerProfileId: validation.data.learnerProfileId,
      successCriteria: validation.data.successCriteria,
      requiredSkills: validation.data.requiredSkills,
      priority: validation.data.priority,
      context: validation.data.context
    });

    sendTranslatedResponse(res, 'objectives.create.success', {
      statusCode: 201,
      data: result
    });
  }

  async deleteObjective(req: AuthRequest, res: Response): Promise<void> {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const result = await objectiveService.deleteObjective({
      userId: req.userId,
      objectiveId: req.params.objectiveId
    });

    sendTranslatedResponse(res, 'objectives.delete.success', {
      statusCode: 200,
      data: result
    });
  }

  async generateSprint(req: AuthRequest, res: Response, _next: NextFunction): Promise<void> {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const validation = generateSprintSchema.safeParse({
      ...req.body,
      objectiveId: req.params.objectiveId
    });

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SPRINT_PAYLOAD',
          message: validation.error.message
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const sprint = await objectiveService.generateSprint({
      userId: req.userId,
      objectiveId: validation.data.objectiveId,
      learnerProfileId: validation.data.learnerProfileId,
      preferLength: validation.data.preferLength,
      allowedResources: validation.data.allowedResources
    });

    sendTranslatedResponse(res, 'objectives.sprint.generated', {
      statusCode: 201,
      data: sprint
    });
  }

  async expandSprint(req: AuthRequest, res: Response): Promise<void> {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const validation = expandSprintSchema.safeParse({
      ...req.body,
      objectiveId: req.params.objectiveId,
      sprintId: req.params.sprintId
    });

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_SPRINT_EXPANSION_PAYLOAD',
          message: validation.error.message
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const result = await objectiveService.expandSprint({
      userId: req.userId,
      objectiveId: validation.data.objectiveId,
      sprintId: validation.data.sprintId,
      targetLengthDays: validation.data.targetLengthDays,
      additionalDays: validation.data.additionalDays,
      additionalMicroTasks: validation.data.additionalMicroTasks
    });

    sendTranslatedResponse(res, 'objectives.sprint.expanded', {
      statusCode: 200,
      data: result
    });
  }

  async getSprint(req: AuthRequest, res: Response, _next: NextFunction): Promise<void> {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const sprint = await objectiveService.getSprint(req.userId, req.params.objectiveId, req.params.sprintId);

    sendTranslatedResponse(res, 'objectives.sprint.retrieved', {
      statusCode: 200,
      data: sprint
    });
  }

  async submitSprintEvidence(req: AuthRequest, res: Response): Promise<void> {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const validation = submitSprintEvidenceSchema.safeParse({
      ...req.body,
      objectiveId: req.params.objectiveId,
      sprintId: req.params.sprintId
    });

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_EVIDENCE_PAYLOAD',
          message: validation.error.message
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const result = await objectiveService.submitSprintEvidence({
      userId: req.userId,
      objectiveId: validation.data.objectiveId,
      sprintId: validation.data.sprintId,
      artifacts: validation.data.artifacts,
      selfEvaluation: validation.data.selfEvaluation,
      markSubmitted: validation.data.markSubmitted ?? false
    });

    sendTranslatedResponse(res, 'objectives.sprint.evidenceSaved', {
      statusCode: 200,
      data: result
    });
  }

  async reviewSprint(req: AuthRequest, res: Response): Promise<void> {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const validation = reviewSprintSchema.safeParse({
      objectiveId: req.params.objectiveId,
      sprintId: req.params.sprintId
    });

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REVIEW_REQUEST',
          message: validation.error.message
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const result = await objectiveService.reviewSprint({
      userId: req.userId,
      objectiveId: validation.data.objectiveId,
      sprintId: validation.data.sprintId
    });

    sendTranslatedResponse(res, 'objectives.sprint.reviewCompleted', {
      statusCode: 200,
      data: result
    });
  }

  async getSprintReview(req: AuthRequest, res: Response): Promise<void> {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const validation = reviewSprintSchema.safeParse({
      objectiveId: req.params.objectiveId,
      sprintId: req.params.sprintId
    });

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REVIEW_REQUEST',
          message: validation.error.message
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const result = await objectiveService.getSprintReview({
      userId: req.userId,
      objectiveId: validation.data.objectiveId,
      sprintId: validation.data.sprintId
    });

    sendTranslatedResponse(res, 'objectives.sprint.reviewRetrieved', {
      statusCode: 200,
      data: result
    });
  }

  async completeObjective(req: AuthRequest, res: Response): Promise<void> {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const { objectiveId } = req.params;
    const { completionNotes } = req.body;

    const result = await objectiveService.completeObjective({
      userId: req.userId,
      objectiveId,
      completionNotes
    });

    sendTranslatedResponse(res, 'objectives.completed', {
      statusCode: 200,
      data: result
    });
  }

  async getSprintGenerationStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { objectiveId } = req.params;
      const userId = req.userId;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
          timestamp: new Date().toISOString()
        });
        return;
      }

      const status = await sprintAutoGenerationService.getGenerationStatus(objectiveId);

      res.json({
        success: true,
        data: status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
}

export const objectiveController = new ObjectiveController();
