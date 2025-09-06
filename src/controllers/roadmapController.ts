import { Response } from 'express';
import { roadmapService, RoadmapGenerationRequest, ProgressUpdateRequest, RoadmapType } from '../services/roadmapService';
import { asyncHandler } from '../middlewares/errorMiddleware.js';
import { AuthRequest } from '../middlewares/authMiddleware';

export class RoadmapController {
  // Generate a new roadmap
  generateRoadmap = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    const request: RoadmapGenerationRequest = {
      userId: req.userId,
      quizResultId: req.body.quizResultId,
      roadmapType: req.body.roadmapType as RoadmapType
    };
    
    const roadmap = await roadmapService.generateRoadmap(request);
    
    res.status(201).json({
      success: true,
      data: roadmap,
      timestamp: new Date().toISOString()
    });
  });
  
  // Get a specific roadmap
  getRoadmap = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    const roadmapId = req.params.id;
    const roadmap = await roadmapService.getRoadmap(roadmapId, req.userId);
    
    res.status(200).json({
      success: true,
      data: roadmap,
      timestamp: new Date().toISOString()
    });
  });
  
  // Get all roadmaps for a user
  getUserRoadmaps = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    const roadmaps = await roadmapService.getUserRoadmaps(req.userId);
    
    res.status(200).json({
      success: true,
      data: roadmaps,
      timestamp: new Date().toISOString()
    });
  });
  
  // Update progress for a roadmap
  updateProgress = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    const roadmapId = req.params.id;
    const completedTaskIds = req.body.completedTasks;
    
    const request: ProgressUpdateRequest = {
      userId: req.userId,
      roadmapId,
      completedTaskIds
    };
    
    const progress = await roadmapService.updateProgress(request);
    
    res.status(200).json({
      success: true,
      data: progress,
      timestamp: new Date().toISOString()
    });
  });
}

export const roadmapController = new RoadmapController();
