import { Request, Response, NextFunction } from 'express';
import { createObjectiveSchema, generateSprintSchema } from '../validation/objectiveSchemas.js';
import { objectiveService } from '../services/objectiveService.js';
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
      roadmapType: validation.data.roadmapType
    });

    sendTranslatedResponse(res, 'objectives.create.success', {
      statusCode: 201,
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
      preferLength: validation.data.preferLength
    });

    sendTranslatedResponse(res, 'objectives.sprint.generated', {
      statusCode: 201,
      data: sprint
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
}

export const objectiveController = new ObjectiveController();
