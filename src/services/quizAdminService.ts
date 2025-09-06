import { randomUUID } from 'crypto';
import { prisma } from '../prisma/typedClient';
import { AppError } from '../errors/AppError';

interface QuizQuestionInput {
  key: string;
  title: string;
  description: string;
  type: 'single_select' | 'multi_select';
  weightCategory: string;
  sortOrder: number;
  isActive: boolean;
  version: number;
}

interface QuizOptionInput {
  label: string;
  value: string;
  weights: Record<string, number>;
}

interface QuizQuestionWithOptions extends QuizQuestionInput {
  options: QuizOptionInput[];
}

interface PaginationOptions {
  page: number;
  limit: number;
  version?: number;
  isActive?: boolean;
}

export class QuizAdminService {
  // Create a new quiz question
  async createQuizQuestion(data: QuizQuestionInput) {
    try {
      const question = await prisma.quizQuestion.create({
        data: {
          id: randomUUID(),
          ...data,
        },
      });
      return question;
    } catch (error) {
      throw new AppError(`Failed to create quiz question: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  // Create a quiz question with options in a single transaction
  async createQuizQuestionWithOptions(data: QuizQuestionWithOptions) {
    try {
      const { options, ...questionData } = data;
      
      // Use a transaction to ensure both question and options are created
      const result = await prisma.$transaction(async (tx: any) => {
        // Create the question
        const question = await tx.quizQuestion.create({
          data: {
            id: randomUUID(),
            ...questionData,
          },
        });

        // Create the options
        const createdOptions = await Promise.all(
          options.map(async (option) => {
            return tx.quizOption.create({
              data: {
                id: randomUUID(),
                questionId: question.id,
                ...option,
              },
            });
          })
        );

        return {
          question,
          options: createdOptions,
        };
      });

      return result;
    } catch (error) {
      throw new AppError(`Failed to create quiz question with options: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  // Get all quiz questions with pagination
  async getQuizQuestions(options: PaginationOptions) {
    try {
      const { page, limit, version, isActive } = options;
      const skip = (page - 1) * limit;

      // Build filter conditions
      const where: any = {};
      if (version !== undefined) {
        where.version = version;
      }
      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      // Get questions with count
      const [questions, total] = await Promise.all([
        prisma.quizQuestion.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            sortOrder: 'asc',
          },
          include: {
            options: true,
          },
        }),
        prisma.quizQuestion.count({ where }),
      ]);

      return {
        data: questions,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new AppError(`Failed to get quiz questions: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  // Get a quiz question by ID
  async getQuizQuestionById(id: string) {
    try {
      const question = await prisma.quizQuestion.findUnique({
        where: { id },
        include: {
          options: true,
        },
      });

      if (!question) {
        throw new AppError(`Quiz question with ID ${id} not found`, 404);
      }

      return question;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to get quiz question: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  // Update a quiz question
  async updateQuizQuestion(id: string, data: Partial<QuizQuestionInput>) {
    try {
      // Check if question exists
      const existingQuestion = await prisma.quizQuestion.findUnique({
        where: { id },
      });

      if (!existingQuestion) {
        throw new AppError(`Quiz question with ID ${id} not found`, 404);
      }

      // Update the question
      const updatedQuestion = await prisma.quizQuestion.update({
        where: { id },
        data,
      });

      return updatedQuestion;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to update quiz question: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  // Delete a quiz question and its options
  async deleteQuizQuestion(id: string) {
    try {
      // Check if question exists
      const existingQuestion = await prisma.quizQuestion.findUnique({
        where: { id },
        include: {
          options: true,
        },
      });

      if (!existingQuestion) {
        throw new AppError(`Quiz question with ID ${id} not found`, 404);
      }

      // Use transaction to delete options and question
      await prisma.$transaction(async (tx: any) => {
        // Delete all options first
        await tx.quizOption.deleteMany({
          where: {
            questionId: id,
          },
        });

        // Delete the question
        await tx.quizQuestion.delete({
          where: { id },
        });
      });

      return { success: true, message: 'Quiz question and its options deleted successfully' };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to delete quiz question: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  // Create a new quiz option
  async createQuizOption(data: QuizOptionInput & { questionId: string }) {
    try {
      // Check if the question exists
      const question = await prisma.quizQuestion.findUnique({
        where: { id: data.questionId },
      });

      if (!question) {
        throw new AppError(`Quiz question with ID ${data.questionId} not found`, 404);
      }

      const option = await prisma.quizOption.create({
        data: {
          id: randomUUID(),
          ...data,
        },
      });

      return option;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to create quiz option: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  // Update a quiz option
  async updateQuizOption(id: string, data: Partial<QuizOptionInput>) {
    try {
      // Check if option exists
      const existingOption = await prisma.quizOption.findUnique({
        where: { id },
      });

      if (!existingOption) {
        throw new AppError(`Quiz option with ID ${id} not found`, 404);
      }

      // Update the option
      const updatedOption = await prisma.quizOption.update({
        where: { id },
        data,
      });

      return updatedOption;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to update quiz option: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  // Delete a quiz option
  async deleteQuizOption(id: string) {
    try {
      // Check if option exists
      const existingOption = await prisma.quizOption.findUnique({
        where: { id },
      });

      if (!existingOption) {
        throw new AppError(`Quiz option with ID ${id} not found`, 404);
      }

      // Delete the option
      await prisma.quizOption.delete({
        where: { id },
      });

      return { success: true, message: 'Quiz option deleted successfully' };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to delete quiz option: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }
}

export const quizAdminService = new QuizAdminService();
