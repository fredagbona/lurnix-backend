import Groq from 'groq-sdk';
import { z } from 'zod';
import { PrismaClient, SkillDifficulty, QuizType, QuestionType } from '@prisma/client';
import { config } from '../config/environment.js';

const prisma = new PrismaClient();
const groq = new Groq({ apiKey: config.groqApiKey });

// ============================================
// INTERFACES
// ============================================

export interface GeneratedQuestion {
  type: QuestionType;
  question: string;
  explanation: string;
  options?: Array<{ id: string; text: string; isCorrect: boolean }>;
  codeTemplate?: string;
  expectedOutput?: string;
  difficulty: SkillDifficulty;
  skillIds: string[];
  points: number;
}

export interface QuizGenerationParams {
  skills: Array<{ id: string; name: string; difficulty: SkillDifficulty }>;
  difficulty: SkillDifficulty;
  questionCount: number;
  type: QuizType;
  context?: string;
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

const QuestionOptionSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  isCorrect: z.boolean(),
});

const GeneratedQuestionSchema = z.object({
  type: z.enum(['multiple_choice', 'multiple_select', 'code_completion', 'code_output', 'true_false', 'short_answer']),
  question: z.string().min(10),
  explanation: z.string().min(10),
  options: z.array(QuestionOptionSchema).optional(),
  codeTemplate: z.string().optional(),
  expectedOutput: z.string().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  skillIds: z.array(z.string()).min(1),
  points: z.number().min(1).max(10),
});

const QuizGenerationResponseSchema = z.object({
  questions: z.array(GeneratedQuestionSchema).min(1).max(20),
  reasoning: z.string().min(10),
});

// ============================================
// AI PROMPTS
// ============================================

const QUIZ_GENERATION_SYSTEM_PROMPT = `You are an expert quiz generator for technical learning content.
Your job is to create high-quality, accurate questions that test understanding, not just memorization.

QUESTION TYPES:
1. multiple_choice: One correct answer from 4 options
2. multiple_select: Multiple correct answers (2-3 correct out of 4-5 options)
3. code_completion: Fill in missing code
4. code_output: Predict what code will output
5. true_false: True or false statement
6. short_answer: Brief text answer (for manual grading)

RULES:
1. Questions must be clear, unambiguous, and test real understanding
2. Avoid trick questions or overly pedantic details
3. Options should be plausible (no obviously wrong answers)
4. Explanations should teach, not just state the answer
5. Code questions should be practical and realistic
6. Difficulty should match the skill level
7. Each question should map to specific skills being tested

OUTPUT: Valid JSON matching the schema exactly.`;

// ============================================
// QUIZ GENERATION SERVICE
// ============================================

class QuizGenerationService {
  /**
   * Generate quiz questions using AI
   */
  async generateQuestions(params: QuizGenerationParams): Promise<GeneratedQuestion[]> {
    const { skills, difficulty, questionCount, type, context } = params;

    // Build skill context
    const skillsContext = skills
      .map((s) => `- ${s.name} (${s.difficulty})`)
      .join('\n');

    // Build quiz type context
    const typeContext = this.getQuizTypeContext(type);

    const userPrompt = `QUIZ CONTEXT:
${typeContext}
${context ? `\nAdditional Context: ${context}` : ''}

SKILLS TO TEST:
${skillsContext}

TARGET DIFFICULTY: ${difficulty}
QUESTION COUNT: ${questionCount}

Generate ${questionCount} high-quality questions that test understanding of these skills.
Mix question types appropriately (prefer multiple_choice and code questions for technical content).
Ensure questions are practical and test real-world application, not just definitions.`;

    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: QUIZ_GENERATION_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.4,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No response from AI');
      }

      const parsed = JSON.parse(responseContent);
      const validated = QuizGenerationResponseSchema.parse(parsed);

      return validated.questions;
    } catch (error) {
      console.error('Quiz generation failed:', error);
      // Fallback to template-based questions
      return this.generateFallbackQuestions(skills, questionCount, difficulty);
    }
  }

  /**
   * Generate adaptive questions based on previous performance
   */
  async generateAdaptiveQuestions(params: {
    userId: string;
    skillId: string;
    previousAttempts: Array<{ score: number; weakAreas: string[] }>;
    questionCount: number;
  }): Promise<GeneratedQuestion[]> {
    const { userId, skillId, previousAttempts, questionCount } = params;

    // Get skill details
    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
    });

    if (!skill) {
      throw new Error(`Skill ${skillId} not found`);
    }

    // Analyze previous attempts
    const avgScore = previousAttempts.reduce((sum, a) => sum + a.score, 0) / previousAttempts.length;
    const allWeakAreas = previousAttempts.flatMap((a) => a.weakAreas);
    const weakAreaCounts = allWeakAreas.reduce((acc, area) => {
      acc[area] = (acc[area] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Focus on weak areas
    const focusAreas = Object.entries(weakAreaCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([area]) => area);

    const context = `Previous Performance:
- Average Score: ${avgScore.toFixed(1)}%
- Weak Areas: ${focusAreas.join(', ') || 'None identified'}
- Attempts: ${previousAttempts.length}

Focus questions on weak areas and adjust difficulty based on performance.`;

    return this.generateQuestions({
      skills: [{ id: skill.id, name: skill.name, difficulty: skill.difficulty }],
      difficulty: avgScore > 80 ? 'advanced' : avgScore > 60 ? 'intermediate' : 'beginner',
      questionCount,
      type: 'skill_check',
      context,
    });
  }

  /**
   * Create quiz in database from generated questions
   */
  async createQuiz(params: {
    sprintId?: string;
    objectiveId?: string;
    skillIds: string[];
    type: QuizType;
    title: string;
    description?: string;
    questions: GeneratedQuestion[];
    passingScore?: number;
  }) {
    const { sprintId, objectiveId, skillIds, type, title, description, questions, passingScore = 80 } = params;

    const quiz = await prisma.knowledgeQuiz.create({
      data: {
        sprintId,
        objectiveId,
        skillIds,
        type,
        title,
        description,
        passingScore,
        questions: {
          create: questions.map((q, idx) => ({
            type: q.type,
            question: q.question,
            explanation: q.explanation,
            options: q.options,
            codeTemplate: q.codeTemplate,
            expectedOutput: q.expectedOutput,
            difficulty: q.difficulty,
            skillIds: q.skillIds,
            points: q.points,
            sortOrder: idx,
          })),
        },
      },
      include: {
        questions: true,
      },
    });

    return quiz;
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Get context for quiz type
   */
  private getQuizTypeContext(type: QuizType): string {
    const contexts: Record<QuizType, string> = {
      pre_sprint: 'Pre-Sprint Readiness Check: Test if learner has prerequisite knowledge to start the sprint.',
      post_sprint: 'Post-Sprint Validation: Verify learner understood and retained sprint content.',
      skill_check: 'Skill Checkpoint: Assess current proficiency in specific skills.',
      review: 'Spaced Repetition Review: Check if previously learned skills are retained.',
      milestone: 'Milestone Assessment: Comprehensive test of all skills learned up to this point.',
    };

    return contexts[type] || 'General knowledge check';
  }

  /**
   * Generate fallback questions when AI fails
   */
  private generateFallbackQuestions(
    skills: Array<{ id: string; name: string; difficulty: SkillDifficulty }>,
    questionCount: number,
    difficulty: SkillDifficulty
  ): GeneratedQuestion[] {
    const questions: GeneratedQuestion[] = [];

    for (let i = 0; i < Math.min(questionCount, skills.length * 2); i++) {
      const skill = skills[i % skills.length];

      questions.push({
        type: 'multiple_choice',
        question: `Which of the following best describes ${skill.name}?`,
        explanation: `This question tests your understanding of ${skill.name}.`,
        options: [
          { id: 'a', text: 'Option A (placeholder)', isCorrect: true },
          { id: 'b', text: 'Option B (placeholder)', isCorrect: false },
          { id: 'c', text: 'Option C (placeholder)', isCorrect: false },
          { id: 'd', text: 'Option D (placeholder)', isCorrect: false },
        ],
        difficulty: skill.difficulty,
        skillIds: [skill.id],
        points: 1,
      });
    }

    return questions;
  }
}

export default new QuizGenerationService();
