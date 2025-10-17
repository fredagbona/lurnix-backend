import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/errorMiddleware.js';
import technicalAssessmentService from '../services/technicalAssessmentService.js';
import { AuthRequest } from '../middlewares/authMiddleware';

class TechnicalAssessmentController {
  getQuestions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const requestLanguage = (req as any).language || (req as any).lng || 'en';
    const payload = technicalAssessmentService.getQuestions(requestLanguage);

    res.status(200).json({
      success: true,
      data: payload,
      timestamp: new Date().toISOString()
    });
  });

  submitAssessment = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
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

    const result = await technicalAssessmentService.submitAssessment({
      userId: req.userId,
      answers: req.body.answers,
      version: req.body.version
    });

    res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  });
}

export const technicalAssessmentController = new TechnicalAssessmentController();
export default technicalAssessmentController;
