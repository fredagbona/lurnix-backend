import { Response } from 'express';
import { asyncHandler } from '../../../middlewares/errorMiddleware.js';
import { AdminAuthRequest } from '../../../middlewares/adminAuthMiddleware.js';
import {
  featureRequestService,
  FeatureRequestRateLimitError,
} from '../services';
import {
  FeatureRequestNotFoundError,
  DuplicateFeatureRequestTitleError,
} from '../repositories/featureRequestRepository.js';
import type {
  MergeFeatureRequestsInput,
  UpdateFeatureRequestInput,
  CreateModNoteInput,
} from '../types/featureRequests.js';

export class FeatureRequestAdminController {
  getFeature = asyncHandler(async (req: AdminAuthRequest, res: Response): Promise<void> => {
    const featureId = BigInt(req.params.id);

    try {
      const feature = await featureRequestService.getAdminFeatureRequest(featureId);
      res.status(200).json({
        success: true,
        data: feature,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
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

  updateFeature = asyncHandler(async (req: AdminAuthRequest, res: Response): Promise<void> => {
    const featureId = BigInt(req.params.id);

    const updatePayload: UpdateFeatureRequestInput = {
      title: req.body.title,
      description: req.body.description,
      category: req.body.category,
      status: req.body.status,
      tags: req.body.tags,
      mergedIntoId: req.body.mergedIntoId ? BigInt(req.body.mergedIntoId) : req.body.mergedIntoId,
    };

    try {
      const updated = await featureRequestService.updateFeatureRequest(featureId, updatePayload, {
        changedByAdminId: req.adminId || undefined,
      });

      res.status(200).json({
        success: true,
        data: updated,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
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

      throw error;
    }
  });

  mergeFeatures = asyncHandler(async (req: AdminAuthRequest, res: Response): Promise<void> => {
    const sourceId = BigInt(req.params.id);
    const targetId = BigInt(req.body.targetId);

    const payload: MergeFeatureRequestsInput = {
      sourceId,
      targetId,
      mergedByAdminId: req.adminId || undefined,
      closeWithStatus: req.body.closeWithStatus,
    };

    try {
      const merged = await featureRequestService.mergeFeatureRequests(payload);
      res.status(200).json({
        success: true,
        data: merged,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
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

  addModeratorNote = asyncHandler(async (req: AdminAuthRequest, res: Response): Promise<void> => {
    const featureId = BigInt(req.params.id);

    const payload: CreateModNoteInput = {
      featureId,
      authorAdminId: req.adminId || 'admin',
      note: req.body.note,
    };

    try {
      const note = await featureRequestService.addModeratorNote(payload);
      res.status(201).json({
        success: true,
        data: note,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
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

export const featureRequestAdminController = new FeatureRequestAdminController();
