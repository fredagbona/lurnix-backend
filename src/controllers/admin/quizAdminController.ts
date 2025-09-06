import { Request, Response, NextFunction } from 'express';
import { quizAdminService } from '../../services/quizAdminService';
import { 
  createQuizQuestionSchema, 
  updateQuizQuestionSchema,
  createQuizOptionSchema,
  updateQuizOptionSchema,
  createQuizQuestionWithOptionsSchema,
  getQuizQuestionsSchema,
  getQuizQuestionByIdSchema,
  deleteQuizQuestionSchema,
  deleteQuizOptionSchema
} from '../../validations/quizAdminSchema';
import { AppError } from '../../errors/AppError';

export class QuizAdminController {
  // Create a new quiz question
  async createQuizQuestion(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = createQuizQuestionSchema.parse(req.body);
      const question = await quizAdminService.createQuizQuestion(validatedData);
      
      res.status(201).json({
        success: true,
        data: question,
      });
    } catch (error) {
      next(error);
    }
  }

  // Create a quiz question with options
  async createQuizQuestionWithOptions(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = createQuizQuestionWithOptionsSchema.parse(req.body);
      const result = await quizAdminService.createQuizQuestionWithOptions(validatedData);
      
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get all quiz questions with pagination
  async getQuizQuestions(req: Request, res: Response, next: NextFunction) {
    try {
      const query = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        version: req.query.version ? parseInt(req.query.version as string) : undefined,
        isActive: req.query.isActive ? req.query.isActive === 'true' : undefined,
      };
      
      const validatedQuery = getQuizQuestionsSchema.parse(query);
      const result = await quizAdminService.getQuizQuestions(validatedQuery);
      
      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get a quiz question by ID
  async getQuizQuestionById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = getQuizQuestionByIdSchema.parse(req.params);
      const question = await quizAdminService.getQuizQuestionById(id);
      
      res.status(200).json({
        success: true,
        data: question,
      });
    } catch (error) {
      next(error);
    }
  }

  // Update a quiz question
  async updateQuizQuestion(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = getQuizQuestionByIdSchema.parse(req.params);
      const validatedData = updateQuizQuestionSchema.partial().parse(req.body);
      
      // Remove id from the data if it exists (we're using the id from params)
      const { id: _, ...dataToUpdate } = validatedData;
      
      const updatedQuestion = await quizAdminService.updateQuizQuestion(id, dataToUpdate);
      
      res.status(200).json({
        success: true,
        data: updatedQuestion,
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete a quiz question
  async deleteQuizQuestion(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = deleteQuizQuestionSchema.parse(req.params);
      const result = await quizAdminService.deleteQuizQuestion(id);
      
      // Extract message to avoid duplicate success property
      const { message } = result;
      res.status(200).json({
        success: true,
        message,
      });
    } catch (error) {
      next(error);
    }
  }

  // Create a new quiz option
  async createQuizOption(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = createQuizOptionSchema.parse(req.body);
      const option = await quizAdminService.createQuizOption(validatedData);
      
      res.status(201).json({
        success: true,
        data: option,
      });
    } catch (error) {
      next(error);
    }
  }

  // Update a quiz option
  async updateQuizOption(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const validatedData = updateQuizOptionSchema.partial().parse(req.body);
      
      // Remove id from the data if it exists (we're using the id from params)
      const { id: _, ...dataToUpdate } = validatedData;
      
      const updatedOption = await quizAdminService.updateQuizOption(id, dataToUpdate);
      
      res.status(200).json({
        success: true,
        data: updatedOption,
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete a quiz option
  async deleteQuizOption(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = deleteQuizOptionSchema.parse(req.params);
      const result = await quizAdminService.deleteQuizOption(id);
      
      // Extract message to avoid duplicate success property
      const { message } = result;
      res.status(200).json({
        success: true,
        message,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const quizAdminController = new QuizAdminController();
