import i18next from 'i18next';
import { AppError } from '../errors/AppError';
import { db } from '../prisma/prismaWrapper';
import {
  quizPersonalityDimensions,
  quizProfileMapping,
  quizProfileNameKey,
  quizProfileSummaryKey
} from '../config/quizScoring';

// Define types for quiz-related data
export interface QuizSection {
  id: string;
  title: string;
  description?: string;
  titleKey: string;
  descriptionKey?: string;
  sortOrder: number;
  questions: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  key: string;
  title: string;
  description?: string;
  titleKey: string;
  descriptionKey?: string;
  type: string;
  sortOrder: number;
  weightCategory?: string;
  sectionId?: string;
  options: QuizOption[];
}

export interface QuizOption {
  id: string;
  label: string;
  labelKey: string;
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
  async getActiveQuiz(
    version?: number,
    language: string = 'en',
    options: { includeWeights?: boolean } = {}
  ): Promise<any> {
    try {
      let resolvedVersion = version;

      if (!resolvedVersion) {
        const latestQuestion = await db.quizQuestion.findFirst({
          where: { isActive: true },
          orderBy: { version: 'desc' }
        });

        if (!latestQuestion) {
          throw new AppError('No active quiz found', 404);
        }

        resolvedVersion = latestQuestion.version;
      }

      const [sections, standaloneQuestions] = await Promise.all([
        db.quizSection.findMany({
          where: {
            version: resolvedVersion,
            isActive: true
          },
          include: {
            questions: {
              where: { isActive: true },
              include: { options: true },
              orderBy: { sortOrder: 'asc' }
            }
          },
          orderBy: { sortOrder: 'asc' }
        }),
        db.quizQuestion.findMany({
          where: {
            version: resolvedVersion,
            isActive: true,
            sectionId: null
          },
          include: { options: true },
          orderBy: { sortOrder: 'asc' }
        })
      ]);

      if (sections.length === 0 && standaloneQuestions.length === 0) {
        throw new AppError(`No active questions found for version ${resolvedVersion}`, 404);
      }

      const translate = (key?: string | null) => {
        if (!key) return undefined;
        const result = i18next.t(key, {
          lng: language,
          ns: 'quiz',
          defaultValue: key
        });
        return result;
      };

      const formatOption = (option: any) => ({
        id: option.id,
        value: option.value,
        labelKey: option.label,
        label: translate(option.label),
        ...(options.includeWeights ? { weights: option.weights || {} } : {})
      });

      const formatQuestion = (question: any) => ({
        id: question.id,
        key: question.key,
        type: question.type,
        sortOrder: question.sortOrder,
        weightCategory: question.weightCategory || undefined,
        sectionId: question.sectionId || undefined,
        titleKey: question.title,
        title: translate(question.title),
        descriptionKey: question.description || undefined,
        description: question.description ? translate(question.description) : undefined,
        options: question.options.map(formatOption)
      });

      const formattedSections = sections.map((section: any) => ({
        id: section.id,
        sortOrder: section.sortOrder,
        titleKey: section.title,
        title: translate(section.title),
        descriptionKey: section.description || undefined,
        description: section.description ? translate(section.description) : undefined,
        questions: section.questions.map(formatQuestion)
      }));

      const sectionQuestionIds = new Set<string>();
      sections.forEach((section: any) => {
        section.questions.forEach((question: any) => {
          sectionQuestionIds.add(question.id);
        });
      });

      const formattedStandaloneQuestions = standaloneQuestions
        .filter((question: any) => !sectionQuestionIds.has(question.id))
        .map(formatQuestion);

      return {
        version: resolvedVersion,
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
    const quiz = await this.getActiveQuiz(submission.version, 'en', { includeWeights: true });

    const sectionQuestions = quiz.sections.flatMap((section: QuizSection) => section.questions);
    const allQuestions = [...quiz.questions, ...sectionQuestions];

    const questionMap = new Map<string, QuizQuestion>();
    allQuestions.forEach(question => {
      questionMap.set(question.key, question);
    });

    if (questionMap.size === 0) {
      throw new AppError('No quiz questions available for this version', 404);
    }

    const missingKeys = Array.from(questionMap.keys()).filter(key => {
      const value = submission.answers[key];
      if (value === undefined || value === null) {
        return true;
      }
      if (Array.isArray(value)) {
        return value.length === 0;
      }
      return false;
    });

    if (missingKeys.length > 0) {
      throw new AppError(`Missing answers for questions: ${missingKeys.join(', ')}`, 400);
    }

    const computedProfile = this.computeProfile(submission.answers, Array.from(questionMap.values()));

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
  private computeProfile(answers: Record<string, any>, questions: QuizQuestion[]): any {
    const traitScores: Record<string, number> = {};

    const addTraitScore = (trait: string, score: number) => {
      if (!trait) return;
      traitScores[trait] = (traitScores[trait] || 0) + score;
    };

    const applyOptionWeights = (weights?: Record<string, number>, multiplier: number = 1) => {
      if (!weights) return;
      for (const [trait, value] of Object.entries(weights)) {
        addTraitScore(trait, value * multiplier);
      }
    };

    for (const question of questions) {
      const answer = answers[question.key];
      if (answer === undefined || answer === null) {
        continue;
      }

      switch (question.type) {
        case 'multi': {
          const values = Array.isArray(answer) ? answer : [answer];
          values.forEach((value: any) => {
            const option = question.options.find(opt => opt.value === value);
            if (option) {
              applyOptionWeights(option.weights);
            }
          });
          break;
        }

        case 'rank': {
          if (Array.isArray(answer)) {
            const maxWeight = answer.length;
            answer.forEach((value: any, index: number) => {
              const option = question.options.find(opt => opt.value === value);
              if (option) {
                const multiplier = Math.max(maxWeight - index, 1);
                applyOptionWeights(option.weights, multiplier);
              }
            });
          }
          break;
        }

        case 'scale': {
          if (question.weightCategory && typeof answer === 'number') {
            addTraitScore(question.weightCategory, answer);
          }
          break;
        }

        case 'single':
        default: {
          const option = question.options.find(opt => opt.value === answer);
          if (option) {
            applyOptionWeights(option.weights);
          }
          break;
        }
      }

      if (question.weightCategory && (!question.options || question.options.length === 0)) {
        if (typeof answer === 'number') {
          addTraitScore(question.weightCategory, answer);
        } else if (typeof answer === 'string') {
          addTraitScore(question.weightCategory, 1);
        }
      }
    }

    const summarizeDimension = (traits: string[]) => {
      const ordered = traits
        .map(trait => ({ trait, score: Number((traitScores[trait] || 0).toFixed(3)) }))
        .sort((a, b) => b.score - a.score);

      const positiveTotal = ordered.reduce((sum, item) => sum + Math.max(item.score, 0), 0);
      const normalized: Record<string, number> = {};
      ordered.forEach(item => {
        const value = positiveTotal > 0 ? Math.max(item.score, 0) / positiveTotal : 0;
        normalized[item.trait] = Number(value.toFixed(3));
      });

      return {
        dominant: ordered[0] && ordered[0].score !== 0 ? ordered[0].trait : null,
        scores: ordered.reduce((acc, item) => {
          acc[item.trait] = item.score;
          return acc;
        }, {} as Record<string, number>),
        normalizedScores: normalized,
        ordered
      };
    };

    const learningStyle = summarizeDimension(quizPersonalityDimensions.learning_style);
    const problemApproach = summarizeDimension(quizPersonalityDimensions.problem_approach);
    const motivationType = summarizeDimension(quizPersonalityDimensions.motivation_type);
    const resilienceStyle = summarizeDimension(quizPersonalityDimensions.resilience_style);
    const techAffinity = summarizeDimension(quizPersonalityDimensions.tech_affinity);

    const topTraits = Object.entries(traitScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([trait, score]) => ({ trait, score: Number(score.toFixed(3)) }));

    const preferredStack = techAffinity.ordered
      .filter(item => item.score > 0)
      .slice(0, 3)
      .map(item => item.trait);

    const timeAvailability = answers.time_availability || answers.time_per_day;
    const timeMap: Record<string, number> = {
      intensive_time: 150,
      balanced_time: 90,
      constrained_time: 45,
      irregular_time: 60
    };

    const goal = answers.coding_dream || answers.learning_goal || 'general';
    const timePerDay = timeMap[timeAvailability] || 60;

    const learningTotal = ['visual', 'analytical', 'practical'].reduce(
      (sum, trait) => sum + Math.max(learningStyle.normalizedScores[trait] || 0, 0),
      0
    ) || 1;

    const legacyVisual = learningStyle.normalizedScores.visual || 0;
    const legacyReading = learningStyle.normalizedScores.analytical || 0;
    const legacyHandsOn = learningStyle.normalizedScores.practical || 0;

    const recommendedProfile = this.determineProfileRecommendation(traitScores);

    return {
      style: learningStyle.dominant || 'balanced',
      visual: Number((legacyVisual / learningTotal).toFixed(3)),
      reading: Number((legacyReading / learningTotal).toFixed(3)),
      handsOn: Number((legacyHandsOn / learningTotal).toFixed(3)),
      level: answers.experience_level || 'beginner',
      timePerDay,
      goal,
      preferredStack: preferredStack.length > 0 ? preferredStack : ['javascript'],
      motivations: motivationType.ordered.slice(0, 3),
      resilience: resilienceStyle.dominant,
      problemApproach: problemApproach.dominant,
      techAffinity: techAffinity.ordered,
      traitScores,
      topTraits,
      dimensions: {
        learningStyle,
        problemApproach,
        motivationType,
        resilienceStyle,
        techAffinity
      },
      profileRecommendation: recommendedProfile
    };
  }

  private determineProfileRecommendation(traitScores: Record<string, number>) {
    let bestProfile: { key: string; score: number } | null = null;

    for (const [profileKey, mapping] of Object.entries(quizProfileMapping)) {
      let score = 0;

      mapping.primary.forEach(trait => {
        score += (traitScores[trait] || 0) * 2;
      });

      mapping.secondary.forEach(trait => {
        score += (traitScores[trait] || 0) * 1.2;
      });

      mapping.tech_preference.forEach(trait => {
        score += (traitScores[trait] || 0) * 1.5;
      });

      if (!bestProfile || score > bestProfile.score) {
        bestProfile = {
          key: profileKey,
          score: Number(score.toFixed(3))
        };
      }
    }

    if (!bestProfile) {
      return null;
    }

    return {
      key: bestProfile.key,
      score: bestProfile.score,
      nameKey: quizProfileNameKey(bestProfile.key),
      summaryKey: quizProfileSummaryKey(bestProfile.key)
    };
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
