import { AppError } from '../errors/AppError';
import { db } from '../prisma/prismaWrapper';

// Define types for quiz-related data
export interface QuizSection {
  id: string;
  title: string;
  description?: string;
  sortOrder: number;
  questions: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  key: string;
  title: string;
  description: string;
  type: string;
  sortOrder: number;
  weightCategory?: string;
  sectionId?: string;
  options: QuizOption[];
}

export interface QuizOption {
  id: string;
  label: string;
  value: string;
  weights?: Record<string, number>;
}

export interface QuizSubmission {
  userId: string;
  version: number;
  answers: Record<string, any>; // key-value pairs of question keys and answers
}

export class QuizService {
  // Get active quiz questions
  async getActiveQuiz(version?: number): Promise<any> {
    try {
      // If version not specified, get the latest active version
      if (!version) {
        const latestQuestion = await db.quizQuestion.findFirst({
          where: { isActive: true },
          orderBy: { version: 'desc' },
        });
        
        if (!latestQuestion) {
          throw new AppError('No active quiz found', 404);
        }
        
        version = latestQuestion.version;
      }
      
      console.log(`Getting active quiz for version ${version}`);
      
      // Get all sections for this version
      const sections = await db.quizSection.findMany({
        where: { 
          version,
          isActive: true 
        },
        include: {
          questions: {
            where: { isActive: true },
            include: { options: true },
            orderBy: { sortOrder: 'asc' }
          }
        },
        orderBy: {
          sortOrder: 'asc'
        }
      });
      
      console.log(`Found ${sections.length} active sections`);
      
      // Get questions that don't belong to any section
      const standaloneQuestions = await db.quizQuestion.findMany({
        where: { 
          version,
          isActive: true,
          sectionId: null
        },
        include: {
          options: true
        },
        orderBy: {
          sortOrder: 'asc'
        }
      });
      
      console.log(`Found ${standaloneQuestions.length} standalone questions`);
      
      if (sections.length === 0 && standaloneQuestions.length === 0) {
        throw new AppError(`No active questions found for version ${version}`, 404);
      }
      
      // Transform the response to hide internal details
      const formattedSections = sections.map((section: any) => ({
        id: section.id,
        title: section.title,
        description: section.description,
        questions: section.questions.map((question: any) => ({
          id: question.id,
          key: question.key,
          title: question.title,
          description: question.description,
          type: question.type,
          sortOrder: question.sortOrder,
          options: question.options.map((option: any) => ({
            id: option.id,
            label: option.label,
            value: option.value
          }))
        }))
      }));
      
      const formattedStandaloneQuestions = standaloneQuestions.map((question: any) => ({
        id: question.id,
        key: question.key,
        title: question.title,
        description: question.description,
        type: question.type,
        sortOrder: question.sortOrder,
        options: question.options.map((option: any) => ({
          id: option.id,
          label: option.label,
          value: option.value
        }))
      }));
      
      return {
        version,
        sections: formattedSections,
        questions: formattedStandaloneQuestions
      };
    } catch (error) {
      console.error('Error in getActiveQuiz:', error);
      throw error;
    }
  }
  
  // Get quiz sections (admin only)
  async getQuizSections(version?: number): Promise<any> {
    // If version not specified, get the latest version
    if (!version) {
      const latestSection = await db.quizSection.findFirst({
        orderBy: { version: 'desc' },
      });
      
      if (latestSection) {
        version = latestSection.version;
      } else {
        const latestQuestion = await db.quizQuestion.findFirst({
          orderBy: { version: 'desc' },
        });
        
        if (!latestQuestion) {
          throw new AppError('No quiz sections or questions found', 404);
        }
        
        version = latestQuestion.version;
      }
    }
    
    // Get all sections for this version
    const sections = await db.quizSection.findMany({
      where: { version },
      include: {
        questions: {
          include: { options: true },
          orderBy: { sortOrder: 'asc' }
        }
      },
      orderBy: {
        sortOrder: 'asc'
      }
    });
    
    return sections;
  }
  
  // Submit quiz answers and compute profile
  async submitQuiz(submission: QuizSubmission): Promise<any> {
    // Validate that all required questions are answered
    const quiz = await this.getActiveQuiz(submission.version);
    const requiredQuestionKeys = quiz.questions.map((q: any) => q.key);
    
    // Check if all required questions are answered
    const missingKeys = requiredQuestionKeys.filter((key: string) => !submission.answers[key]);
    if (missingKeys.length > 0) {
      throw new AppError(`Missing answers for questions: ${missingKeys.join(', ')}`, 400);
    }
    
    // Compute profile based on answers and weights
    const computedProfile = await this.computeProfile(submission.answers, quiz.questions);
    
    // Save the quiz result
    const quizResult = await db.quizResult.create({
      data: {
        userId: submission.userId,
        version: submission.version,
        answers: submission.answers,
        computedProfile
      }
    });
    
    return {
      quizResultId: quizResult.id,
      profile: computedProfile
    };
  }
  
  // Compute user profile from answers
  private async computeProfile(answers: Record<string, any>, questions: any[]): Promise<any> {
    // Initialize profile with default values
    const profile: Record<string, any> = {
      style: 'balanced',
      visual: 0.33,
      reading: 0.33,
      handsOn: 0.34,
      level: 'beginner',
      timePerDay: 30, // default 30 minutes
      goal: 'general',
      preferredStack: ['javascript']
    };
    
    // Get all question options to calculate weights
    const questionOptionsMap = new Map();
    for (const question of questions) {
      const options = await db.quizOption.findMany({
        where: { questionId: question.id }
      });
      questionOptionsMap.set(question.key, options);
    }
    
    // Process each answer to build the profile
    for (const question of questions) {
      const answer = answers[question.key];
      
      if (!answer) continue;
      
      // Handle different question types
      switch (question.key) {
        case 'learning_style':
          // Find the selected option
          const options = questionOptionsMap.get(question.key);
          const option = options.find((opt: any) => opt.value === answer);
          if (option) {
            profile.style = option.value;
            
            // Apply weights from the option
            const weights = option.weights as Record<string, number>;
            let totalWeight = 0;
            
            for (const [key, weight] of Object.entries(weights)) {
              totalWeight += weight;
            }
            
            // Normalize weights
            if (totalWeight > 0) {
              for (const [key, weight] of Object.entries(weights)) {
                profile[key] = weight / totalWeight;
              }
            }
          }
          break;
          
        case 'time_per_day':
          profile.timePerDay = parseInt(answer, 10) || 30;
          break;
          
        case 'experience_level':
          profile.level = answer;
          break;
          
        case 'goal':
          profile.goal = answer;
          break;
          
        case 'target_stack':
          profile.preferredStack = Array.isArray(answer) ? answer : [answer];
          break;
          
        // Add more cases for other question types
        default:
          // For custom questions, store the answer directly
          if (question.weightCategory) {
            profile[question.weightCategory] = answer;
          }
      }
    }
    
    return profile;
  }
  
  // Get a specific quiz result
  async getQuizResult(quizResultId: string): Promise<any> {
    const result = await db.quizResult.findUnique({
      where: { id: quizResultId }
    });
    
    if (!result) {
      throw new AppError('Quiz result not found', 404);
    }
    
    return result;
  }
  
  // Get all quiz results for a user
  async getUserQuizResults(userId: string): Promise<any> {
    const results = await db.quizResult.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    
    return results;
  }
  
  // Create a new quiz section
  async createQuizSection(sectionData: any): Promise<any> {
    // Create the section
    const section = await db.quizSection.create({
      data: {
        version: sectionData.version,
        title: sectionData.title,
        description: sectionData.description,
        sortOrder: sectionData.sortOrder,
        isActive: sectionData.isActive ?? true
      }
    });
    
    return section;
  }
  
  // Update a quiz section
  async updateQuizSection(id: string, sectionData: any): Promise<any> {
    // Check if the section exists
    const existingSection = await db.quizSection.findUnique({
      where: { id }
    });
    
    if (!existingSection) {
      throw new AppError(`Section with id '${id}' not found`, 404);
    }
    
    // Update the section
    const section = await db.quizSection.update({
      where: { id },
      data: {
        title: sectionData.title,
        description: sectionData.description,
        sortOrder: sectionData.sortOrder,
        isActive: sectionData.isActive
      },
      include: {
        questions: {
          include: { options: true },
          orderBy: { sortOrder: 'asc' }
        }
      }
    });
    
    return section;
  }
  
  // Delete a quiz section
  async deleteQuizSection(id: string): Promise<void> {
    // Check if the section exists
    const existingSection = await db.quizSection.findUnique({
      where: { id }
    });
    
    if (!existingSection) {
      throw new AppError(`Section with id '${id}' not found`, 404);
    }
    
    // Update questions to remove section reference
    await db.quizQuestion.updateMany({
      where: { sectionId: id },
      data: { sectionId: null }
    });
    
    // Delete the section
    await db.quizSection.delete({
      where: { id }
    });
  }
  
  // Create a new quiz question
  async createQuizQuestion(questionData: any): Promise<any> {
    // Check if a question with the same key already exists
    const existingQuestion = await db.quizQuestion.findUnique({
      where: { key: questionData.key }
    });
    
    if (existingQuestion) {
      throw new AppError(`Question with key '${questionData.key}' already exists`, 400);
    }
    
    // Create the question
    const question = await db.quizQuestion.create({
      data: {
        version: questionData.version,
        key: questionData.key,
        title: questionData.title,
        description: questionData.description,
        type: questionData.type,
        weightCategory: questionData.weightCategory,
        sortOrder: questionData.sortOrder,
        isActive: questionData.isActive ?? true,
        sectionId: questionData.sectionId,
        options: {
          create: questionData.options.map((option: any) => ({
            label: option.label,
            value: option.value,
            weights: option.weights || {}
          }))
        }
      },
      include: {
        options: true
      }
    });
    
    return question;
  }
  
  // Update a quiz question
  async updateQuizQuestion(id: string, questionData: any): Promise<any> {
    // Check if the question exists
    const existingQuestion = await db.quizQuestion.findUnique({
      where: { id }
    });
    
    if (!existingQuestion) {
      throw new AppError(`Question with id '${id}' not found`, 404);
    }
    
    // Update the question
    const question = await db.quizQuestion.update({
      where: { id },
      data: {
        title: questionData.title,
        description: questionData.description,
        type: questionData.type,
        weightCategory: questionData.weightCategory,
        sortOrder: questionData.sortOrder,
        isActive: questionData.isActive
      }
    });
    
    // If options are provided, update them
    if (questionData.options) {
      // Delete existing options
      await db.quizOption.deleteMany({
        where: { questionId: id }
      });
      
      // Create new options
      for (const option of questionData.options) {
        await db.quizOption.create({
          data: {
            questionId: id,
            label: option.label,
            value: option.value,
            weights: option.weights || {}
          }
        });
      }
    }
    
    // Get the updated question with options
    const updatedQuestion = await db.quizQuestion.findUnique({
      where: { id },
      include: {
        options: true
      }
    });
    
    return updatedQuestion;
  }
  
  // Delete a quiz question
  async deleteQuizQuestion(id: string): Promise<void> {
    // Check if the question exists
    const existingQuestion = await db.quizQuestion.findUnique({
      where: { id }
    });
    
    if (!existingQuestion) {
      throw new AppError(`Question with id '${id}' not found`, 404);
    }
    
    // Delete the question (this will cascade delete options due to the relation setup)
    await db.quizQuestion.delete({
      where: { id }
    });
  }
}

export const quizService = new QuizService();
