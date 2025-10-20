import { Response } from 'express';
import { asyncHandler } from '../../../middlewares/errorMiddleware.js';
import { AuthRequest } from '../../../middlewares/authMiddleware.js';
import {
  featureRequestService,
  FeatureRequestRateLimitError,
  FeatureCategoryDto,
} from '../services/index.js';
import {
  FeatureRequestNotFoundError,
  DuplicateFeatureRequestTitleError,
} from '../repositories/featureRequestRepository.js';
import type { FeatureListFilters, FeatureListSort } from '../types/featureRequests.js';

export class FeatureRequestController {
  categories = asyncHandler(async (_req: AuthRequest, res: Response): Promise<void> => {
    const categories: FeatureCategoryDto[] = featureRequestService.getCategories();

    res.status(200).json({
      success: true,
      data: categories,
      timestamp: new Date().toISOString(),
    });
  });

  list = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const query = (req as any).validatedQuery || {};

    const filters: FeatureListFilters = {
      status: query.status,
      category: query.category,
      searchQuery: query.q,
      tags: query.tags,
    };

    if (query.cursor) {
      filters.cursor = BigInt(query.cursor);
    }

    if (query.limit) {
      filters.limit = query.limit;
    }

    const sort: FeatureListSort = query.sort ?? 'top';
    const limit = query.limit ?? 20;

    const response = await featureRequestService.listFeatures(
      filters,
      sort,
      limit,
      req.userId
    );

    res.status(200).json({
      success: true,
      data: response,
      timestamp: new Date().toISOString(),
    });
  });

  create = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const locale = (req as any).language || req.user?.language || 'en';

    try {
      const result = await featureRequestService.createFeatureRequest({
        authorId: req.userId,
        title: req.body.title,
        description: req.body.description,
        category: req.body.category,
        tags: req.body.tags,
        locale,
      });

      res.status(201).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      if (error instanceof FeatureRequestRateLimitError) {
        res.status(429).json({
          success: false,
          error: {
            code: 'FEATURE_REQUEST_LIMIT',
            message: error.message,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (error instanceof DuplicateFeatureRequestTitleError) {
        res.status(409).json({
          success: false,
          error: {
            code: 'FEATURE_REQUEST_DUPLICATE',
            message: error.message,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      throw error;
    }
  });

  getById = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const featureId = BigInt(req.params.id);

    try {
      const feature = await featureRequestService.getFeatureRequest(featureId, req.userId);
      res.status(200).json({
        success: true,
        data: feature,
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      if (error instanceof FeatureRequestNotFoundError) {
        res.status(404).json({
          success: false,
          error: {
            code: 'FEATURE_REQUEST_NOT_FOUND',
            message: 'Feature request not found',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      throw error;
    }
  });

  toggleVote = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const featureId = BigInt(req.params.id);

    try {
      const result = await featureRequestService.toggleVote(featureId, req.userId);
      res.status(200).json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      if (error instanceof FeatureRequestNotFoundError) {
        res.status(404).json({
          success: false,
          error: {
            code: 'FEATURE_REQUEST_NOT_FOUND',
            message: 'Feature request not found',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      throw error;
    }
  });
}

export const featureRequestController = new FeatureRequestController();
