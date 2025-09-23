import { Request, Response } from 'express';
import { quizService, QuizSubmission } from '../services/quizService';
import { asyncHandler } from '../middlewares/errorMiddleware.js';
import { AuthRequest } from '../middlewares/authMiddleware';

export class QuizController {
  // Get active quiz questions
  getQuiz = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const version = req.query.version ? parseInt(req.query.version as string, 10) : undefined;
    const language = (req as any).language || (req.headers['accept-language']?.slice(0, 2)) || 'en';

    const quiz = await quizService.getActiveQuiz(version, language);
    
    res.status(200).json({
      success: true,
      data: quiz,
      timestamp: new Date().toISOString()
    });
  });
  
  // Submit quiz answers
  submitQuiz = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
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
    
    const submission: QuizSubmission = {
      userId: req.userId,
      version: req.body.version,
      answers: req.body.answers
    };
    
    const result = await quizService.submitQuiz(submission);
    
    res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  });
  
  // Get a specific quiz result
  getQuizResult = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
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
    
    const quizResultId = req.params.id;
    const result = await quizService.getQuizResult(quizResultId);
    
    // Check if the result belongs to the requesting user
    if (result.userId !== req.userId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this quiz result'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  });
  
  // Get all quiz results for a user
  getUserQuizResults = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
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
    
    const results = await quizService.getUserQuizResults(req.userId);
    
    res.status(200).json({
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    });
  });
  
  // Admin endpoints for managing quiz sections and questions
  
  // Create a new quiz section (admin only)
  createQuizSection = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const sectionData = req.body;
    
    const section = await quizService.createQuizSection(sectionData);
    
    res.status(201).json({
      success: true,
      data: section,
      timestamp: new Date().toISOString()
    });
  });
  
  // Update a quiz section (admin only)
  updateQuizSection = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const sectionId = req.params.id;
    const sectionData = req.body;
    
    const section = await quizService.updateQuizSection(sectionId, sectionData);
    
    res.status(200).json({
      success: true,
      data: section,
      timestamp: new Date().toISOString()
    });
  });
  
  // Delete a quiz section (admin only)
  deleteQuizSection = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const sectionId = req.params.id;
    
    await quizService.deleteQuizSection(sectionId);
    
    res.status(200).json({
      success: true,
      message: 'Quiz section deleted successfully',
      timestamp: new Date().toISOString()
    });
  });
  
  // Get all quiz sections (admin only)
  getQuizSections = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const version = req.query.version ? parseInt(req.query.version as string, 10) : undefined;
    
    const sections = await quizService.getQuizSections(version);
    
    res.status(200).json({
      success: true,
      data: sections,
      timestamp: new Date().toISOString()
    });
  });
  
  // Create a new quiz question (admin only)
  createQuizQuestion = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const questionData = req.body;
    
    const question = await quizService.createQuizQuestion(questionData);
    
    res.status(201).json({
      success: true,
      data: question,
      timestamp: new Date().toISOString()
    });
  });
  
  // Update a quiz question (admin only)
  updateQuizQuestion = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const questionId = req.params.id;
    const questionData = req.body;
    
    const question = await quizService.updateQuizQuestion(questionId, questionData);
    
    res.status(200).json({
      success: true,
      data: question,
      timestamp: new Date().toISOString()
    });
  });
  
  // Delete a quiz question (admin only)
  deleteQuizQuestion = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const questionId = req.params.id;
    
    await quizService.deleteQuizQuestion(questionId);
    
    res.status(200).json({
      success: true,
      message: 'Quiz question deleted successfully',
      timestamp: new Date().toISOString()
    });
  });
}

export const quizController = new QuizController();
