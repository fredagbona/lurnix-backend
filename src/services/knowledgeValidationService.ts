import { PrismaClient, QuizType, SkillDifficulty } from '@prisma/client';
import quizGenerationService from './quizGenerationService.js';
import skillTrackingService from './skillTrackingService.js';
import { profileContextBuilder } from './profileContextBuilder.js';

const prisma = new PrismaClient();

// ============================================
// INTERFACES
// ============================================

export interface QuizResult {
  attemptId: string;
  score: number;
  passed: boolean;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
  skillScores: Record<string, number>;
  weakAreas: string[];
  recommendations: string[];
  learnerProfileId?: string;
}

export interface ReadinessCheck {
  canStart: boolean;
  reason?: string;
  requiredQuiz?: any;
  prerequisiteSkills?: string[];
}

export interface ProgressionCheck {
  canProgress: boolean;
  reason?: string;
  quizScore?: number;
  requiredScore: number;
  attemptsRemaining?: number;
}

// ============================================
// KNOWLEDGE VALIDATION SERVICE
// ============================================

class KnowledgeValidationService {
  /**
   * Generate quiz for sprint/skills
   */
  async generateQuiz(params: {
    sprintId?: string;
    objectiveId?: string;
    skillIds: string[];
    type: QuizType;
    difficulty: SkillDifficulty;
    questionCount: number;
    passingScore?: number;
    language?: string;
  }) {
    const { sprintId, objectiveId, skillIds, type, difficulty, questionCount, passingScore = 80, language = 'en' } = params;

    // Get skill details
    const skills = await prisma.skill.findMany({
      where: { id: { in: skillIds } },
    });

    if (skills.length === 0) {
      throw new Error('No skills found for quiz generation');
    }

    // Generate questions
    const questions = await quizGenerationService.generateQuestions({
      skills: skills.map((s) => ({ id: s.id, name: s.name, difficulty: s.difficulty })),
      difficulty,
      questionCount,
      type,
      language,
    });

    // Create quiz title based on type
    const title = this.generateQuizTitle(type, skills);
    const description = this.generateQuizDescription(type, skills);

    // Create quiz in database
    const quiz = await quizGenerationService.createQuiz({
      sprintId,
      objectiveId,
      skillIds,
      type,
      title,
      description,
      questions,
      passingScore,
    });

    return quiz;
  }

  /**
   * Check if user can start sprint (pre-sprint quiz)
   */
  async validatePreSprintReadiness(params: {
    userId: string;
    sprintId: string;
  }): Promise<ReadinessCheck> {
    const { userId, sprintId } = params;

    // Get sprint with skills
    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        skills: {
          include: { skill: true },
        },
        quizzes: {
          where: { type: 'pre_sprint' },
          include: {
            attempts: {
              where: { userId },
              orderBy: { attemptNumber: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!sprint) {
      throw new Error(`Sprint ${sprintId} not found`);
    }

    // Check if pre-sprint quiz exists
    const preSprintQuiz = sprint.quizzes.find((q) => q.type === 'pre_sprint');

    if (!preSprintQuiz) {
      // No pre-sprint quiz required, can start
      return {
        canStart: true,
      };
    }

    // Check if user has passed the quiz
    const latestAttempt = preSprintQuiz.attempts[0];

    if (!latestAttempt) {
      // User hasn't taken the quiz yet
      return {
        canStart: false,
        reason: 'You must complete the readiness quiz before starting this sprint.',
        requiredQuiz: preSprintQuiz,
      };
    }

    if (!latestAttempt.passed) {
      // User failed the quiz
      const attemptsRemaining = preSprintQuiz.attemptsAllowed - latestAttempt.attemptNumber;

      if (attemptsRemaining > 0) {
        return {
          canStart: false,
          reason: `You need to pass the readiness quiz (score: ${latestAttempt.score}%, required: ${preSprintQuiz.passingScore}%). ${attemptsRemaining} attempts remaining.`,
          requiredQuiz: preSprintQuiz,
        };
      } else {
        return {
          canStart: false,
          reason: 'You have used all quiz attempts. Please review the prerequisite skills and try again later.',
          prerequisiteSkills: sprint.skills.map((ss) => ss.skill.name),
        };
      }
    }

    // User passed the quiz
    return {
      canStart: true,
    };
  }

  /**
   * Submit quiz attempt
   */
  async submitQuizAttempt(params: {
    userId: string;
    quizId: string;
    answers: Array<{
      questionId: string;
      answer: any;
    }>;
    timeSpent: number;
  }): Promise<QuizResult> {
    const { userId, quizId, answers, timeSpent } = params;

    // Auto-detect user language from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { language: true }
    });
    const userLanguage = user?.language ?? 'en';

    // Get quiz with questions and translations
    const quiz = await prisma.knowledgeQuiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          include: {
            translations: true
          }
        },
        attempts: {
          where: { userId },
          orderBy: { attemptNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!quiz) {
      throw new Error(`Quiz ${quizId} not found`);
    }

    // Check attempts remaining
    const latestAttempt = quiz.attempts[0];
    const attemptNumber = latestAttempt ? latestAttempt.attemptNumber + 1 : 1;

    if (attemptNumber > quiz.attemptsAllowed) {
      throw new Error('No attempts remaining for this quiz');
    }

    // Grade the quiz
    const gradeResult = await this.gradeQuiz({
      quiz,
      answers,
    });

    // Create attempt
    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId,
        userId,
        attemptNumber,
        score: gradeResult.score,
        passed: gradeResult.passed,
        timeSpent,
        startedAt: new Date(Date.now() - timeSpent * 1000),
        completedAt: new Date(),
        skillScores: gradeResult.skillScores,
        answers: {
          create: gradeResult.answers.map((a) => ({
            questionId: a.questionId,
            answer: a.answer,
            isCorrect: a.isCorrect,
            pointsEarned: a.pointsEarned,
          })),
        },
      },
    });

    const skillIds = Object.keys(gradeResult.skillScores);
    const resolvedSkills = skillIds.length
      ? await prisma.skill.findMany({
          where: { id: { in: skillIds } },
          select: { id: true, name: true },
        })
      : [];

    const skillNameMap = new Map(resolvedSkills.map((skill) => [skill.id, skill.name]));

    const orderedSkills = skillIds
      .map((skillId) => ({
        id: skillId,
        name: skillNameMap.get(skillId) ?? skillId,
        score: gradeResult.skillScores[skillId],
      }))
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    const dominantStrengths = orderedSkills
      .filter((entry) => typeof entry.score === 'number' && entry.score >= 70)
      .slice(0, 5)
      .map((entry) => entry.name);

    const localizedWeakAreas = gradeResult.weakAreas.map((skillId) => skillNameMap.get(skillId) ?? skillId);

    const profileAttributes = this.buildProfileAttributes({
      quiz,
      answers,
      language: userLanguage
    });

    const computedProfile = {
      quizId,
      attemptId: attempt.id,
      attemptNumber,
      attemptsAllowed: quiz.attemptsAllowed,
      quizType: quiz.type,
      score: gradeResult.score,
      passed: gradeResult.passed,
      totalQuestions: gradeResult.totalQuestions,
      correctAnswers: gradeResult.correctAnswers,
      timeSpent,
      strengths: dominantStrengths,
      gaps: localizedWeakAreas,
      challenges: localizedWeakAreas,
      focusAreas: localizedWeakAreas,
      recommendations: gradeResult.recommendations,
      skillScores: orderedSkills,
      ...profileAttributes
    };

    const learnerProfileSnapshot = await profileContextBuilder.recordSnapshotFromComputedProfile({
      userId,
      computedProfile,
      quizResultId: attempt.id,
    });

    return {
      attemptId: attempt.id,
      score: gradeResult.score,
      passed: gradeResult.passed,
      totalQuestions: gradeResult.totalQuestions,
      correctAnswers: gradeResult.correctAnswers,
      timeSpent,
      skillScores: gradeResult.skillScores,
      weakAreas: gradeResult.weakAreas,
      recommendations: gradeResult.recommendations,
      learnerProfileId: learnerProfileSnapshot.id,
    };
  }

  /**
   * Grade quiz
   */
  private async gradeQuiz(params: {
    quiz: any;
    answers: Array<{ questionId: string; answer: any }>;
  }) {
    const { quiz, answers } = params;

    let totalPoints = 0;
    let earnedPoints = 0;
    let correctAnswers = 0;
    const skillScores: Record<string, { correct: number; total: number }> = {};
    const gradedAnswers: Array<{
      questionId: string;
      answer: any;
      isCorrect: boolean;
      pointsEarned: number;
    }> = [];

    for (const question of quiz.questions) {
      totalPoints += question.points;

      const userAnswer = answers.find((a) => a.questionId === question.id);
      if (!userAnswer) {
        // No answer provided
        gradedAnswers.push({
          questionId: question.id,
          answer: null,
          isCorrect: false,
          pointsEarned: 0,
        });
        continue;
      }

      // Grade based on question type
      const isCorrect = this.gradeAnswer(question, userAnswer.answer);
      const pointsEarned = isCorrect ? question.points : 0;

      if (isCorrect) {
        correctAnswers++;
        earnedPoints += pointsEarned;
      }

      gradedAnswers.push({
        questionId: question.id,
        answer: userAnswer.answer,
        isCorrect,
        pointsEarned,
      });

      // Track skill scores
      for (const skillId of question.skillIds) {
        if (!skillScores[skillId]) {
          skillScores[skillId] = { correct: 0, total: 0 };
        }
        skillScores[skillId].total++;
        if (isCorrect) {
          skillScores[skillId].correct++;
        }
      }
    }

    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = score >= quiz.passingScore;

    // Calculate skill scores as percentages
    const skillScorePercentages: Record<string, number> = {};
    for (const [skillId, scores] of Object.entries(skillScores)) {
      skillScorePercentages[skillId] = (scores.correct / scores.total) * 100;
    }

    // Identify weak areas (skills with < 70% score)
    const weakAreas = Object.entries(skillScorePercentages)
      .filter(([, score]) => score < 70)
      .map(([skillId]) => skillId);

    // Generate recommendations
    const recommendations = this.generateRecommendations({
      score,
      passed,
      weakAreas,
      skillScores: skillScorePercentages,
    });

    return {
      score,
      passed,
      totalQuestions: quiz.questions.length,
      correctAnswers,
      skillScores: skillScorePercentages,
      weakAreas,
      recommendations,
      answers: gradedAnswers,
    };
  }

  private buildProfileAttributes(params: {
    quiz: any;
    answers: Array<{ questionId: string; answer: any }>;
    language: string;
  }): Record<string, unknown> {
    const { quiz, answers } = params;
    const questionLookup = new Map<string, any>();
    for (const question of quiz.questions ?? []) {
      if (question && typeof question === 'object' && typeof question.id === 'string') {
        questionLookup.set(question.id, question);
      }
    }
    const answerLookup = new Map(answers.map((entry) => [entry.questionId, entry.answer]));

    const singleSelection = (questionId: string): string | null => {
      const rawAnswer = answerLookup.get(questionId);
      if (rawAnswer === undefined || rawAnswer === null) {
        return null;
      }
      if (typeof rawAnswer === 'string') {
        return rawAnswer;
      }
      if (Array.isArray(rawAnswer)) {
        return rawAnswer[0] ?? null;
      }
      if (typeof rawAnswer === 'object' && 'optionId' in rawAnswer && typeof rawAnswer.optionId === 'string') {
        return rawAnswer.optionId;
      }
      return null;
    };

    const multiSelection = (questionId: string): string[] => {
      const rawAnswer = answerLookup.get(questionId);
      if (!rawAnswer) {
        return [];
      }
      if (Array.isArray(rawAnswer)) {
        return rawAnswer.filter((value) => typeof value === 'string');
      }
      if (typeof rawAnswer === 'object' && Array.isArray((rawAnswer as any).optionIds)) {
        return (rawAnswer as any).optionIds.filter((value: unknown) => typeof value === 'string');
      }
      if (typeof rawAnswer === 'string') {
        return [rawAnswer];
      }
      return [];
    };

    const optionLabel = (questionId: string, optionId: string | null): string | null => {
      if (!optionId) {
        return null;
      }
      const question = questionLookup.get(questionId) as any;
      const options = Array.isArray(question?.options) ? question.options : [];
      const match = options.find((option: any) => option.id === optionId);
      
      // Apply translation if available
      if (match && params.language !== 'en') {
        const translation = this.findQuestionTranslation(question, params.language);
        if (translation?.options) {
          const translatedOption = translation.options.find((opt: any) => opt.id === optionId);
          if (translatedOption?.text) {
            return translatedOption.text;
          }
        }
      }
      
      return match?.text ?? optionId;
    };

    const HOURS_QUESTION_ID = '15f4a9bb-3f1f-4a4b-89a9-9b961c6e9bf0';
    const WEEKLY_RHYTHM_QUESTION_ID = '2b2b7087-a686-4b0e-8859-9bb83250c0b4';
    const ENERGY_PEAK_QUESTION_ID = '635758ae-84b8-4227-b336-5cd9744d01f9';
    const CONTEXT_SWITCH_QUESTION_ID = '8099d9ce-2c2d-4adf-ae1f-b21af7d1f312';
    const NOTE_STYLE_QUESTION_ID = 'e9d97f5f-f4f4-4928-9e30-4ce8e6fd2182';
    const SUPPORT_CHANNELS_QUESTION_ID = '4c3de70a-6b8f-4f06-9563-9ecf794fa994';
    const FOCUS_PREFERENCE_QUESTION_ID = '74a86960-3485-45c2-9cc2-fbff4ea002be';
    const REVIEW_CADENCE_QUESTION_ID = '4fd14e66-f5d0-4c1f-a7f7-9d2519749031';
    const TECH_PASSIONS_QUESTION_ID = 'c50ce6b4-5f18-4f2c-9483-4799cf5cad5c';
    const PROJECT_ASPIRATION_QUESTION_ID = '0ea343c5-42f0-4c80-a1bb-fc74493540e7';
    const CAREER_VISION_QUESTION_ID = '1cc3af79-0949-4a0d-808f-092534ec4977';
    const BLOCKERS_QUESTION_ID = '1a4b3b7f-3bbf-460a-af27-f94503b9e862';
    const TECH_PERSONA_QUESTION_ID = 'c225c5e1-d2fa-4ccd-9f2e-5e09e1988ab4';
    const TIME_COMMITMENT_QUESTION_ID = 'd9dc6a5d-31ff-4c52-932b-9581f075c67b';
    const MOTIVATION_SIGNAL_QUESTION_ID = '2c0bd51c-4f61-4cff-9b64-5d5c4290f5fb';
    const LEARNING_PREFERENCE_QUESTION_ID = '70c6a603-68d7-4c0e-9f0a-91f1492d5f82';
    const RETENTION_TECHNIQUE_QUESTION_ID = 'ae73f4ec-49ac-498f-b6da-91c7c7648c89';
    const DEBUGGING_STRATEGY_QUESTION_ID = '26645b74-43c0-48bd-b7c3-780872e21e76';
    const STUCK_RESPONSE_QUESTION_ID = '833dfa78-4412-46ac-8f0a-6ec323f53920';
    const GROWTH_STRATEGY_QUESTION_ID = 'f72fdcae-310c-4acd-9f72-ba2f85e93ac7';
    const PLANNING_SYSTEM_QUESTION_ID = 'c8e7936f-63b6-4ae9-9209-f1977570c5d1';

    const hoursSelection = singleSelection(HOURS_QUESTION_ID);
    const hoursPerWeekMap: Record<string, number> = {
      under_5: 4,
      '5_to_10': 8,
      '10_to_15': 12,
      over_15: 18,
    };
    const hoursPerWeek = hoursSelection ? hoursPerWeekMap[hoursSelection] ?? null : null;

    const weeklyRhythmSelection = singleSelection(WEEKLY_RHYTHM_QUESTION_ID);
    const weeklyRhythmLabel = optionLabel(WEEKLY_RHYTHM_QUESTION_ID, weeklyRhythmSelection);

    const energyPeakSelection = singleSelection(ENERGY_PEAK_QUESTION_ID);
    const energyPeakLabel = optionLabel(ENERGY_PEAK_QUESTION_ID, energyPeakSelection);

    const contextSwitchSelection = singleSelection(CONTEXT_SWITCH_QUESTION_ID);
    const contextSwitchLabel = optionLabel(CONTEXT_SWITCH_QUESTION_ID, contextSwitchSelection);

    const noteStyleSelection = singleSelection(NOTE_STYLE_QUESTION_ID);
    const noteStyleLabel = optionLabel(NOTE_STYLE_QUESTION_ID, noteStyleSelection);

    const supportSelections = multiSelection(SUPPORT_CHANNELS_QUESTION_ID);
    const supportLabels = supportSelections.map((selection) => optionLabel(SUPPORT_CHANNELS_QUESTION_ID, selection)).filter((label): label is string => Boolean(label));

    const focusPreferenceSelection = singleSelection(FOCUS_PREFERENCE_QUESTION_ID);
    const focusPreferenceLabel = optionLabel(FOCUS_PREFERENCE_QUESTION_ID, focusPreferenceSelection);

    const reviewCadenceSelection = singleSelection(REVIEW_CADENCE_QUESTION_ID);
    const reviewCadenceLabel = optionLabel(REVIEW_CADENCE_QUESTION_ID, reviewCadenceSelection);

    const timeCommitmentSelection = singleSelection(TIME_COMMITMENT_QUESTION_ID);
    const timeCommitmentLabel = optionLabel(TIME_COMMITMENT_QUESTION_ID, timeCommitmentSelection);

    const passionSelections = [
      { questionId: TECH_PASSIONS_QUESTION_ID, selection: singleSelection(TECH_PASSIONS_QUESTION_ID) },
      { questionId: PROJECT_ASPIRATION_QUESTION_ID, selection: singleSelection(PROJECT_ASPIRATION_QUESTION_ID) },
      { questionId: MOTIVATION_SIGNAL_QUESTION_ID, selection: singleSelection(MOTIVATION_SIGNAL_QUESTION_ID) },
    ];

    const passionTags = Array.from(
      new Set(
        passionSelections
          .map(({ questionId, selection }) => optionLabel(questionId, selection))
          .filter((label): label is string => Boolean(label))
      )
    );

    const careerVisionSelection = singleSelection(CAREER_VISION_QUESTION_ID);
    const careerVisionLabel = optionLabel(CAREER_VISION_QUESTION_ID, careerVisionSelection);
    const projectAspirationLabel = optionLabel(PROJECT_ASPIRATION_QUESTION_ID, singleSelection(PROJECT_ASPIRATION_QUESTION_ID));
    const goals = [careerVisionLabel, projectAspirationLabel].filter((label): label is string => Boolean(label));

    const blockerSelection = singleSelection(BLOCKERS_QUESTION_ID);
    const blockerLabel = optionLabel(BLOCKERS_QUESTION_ID, blockerSelection);
    const blockers = blockerLabel ? [blockerLabel] : [];

    const personaSelection = singleSelection(TECH_PERSONA_QUESTION_ID);
    const personaLabel = optionLabel(TECH_PERSONA_QUESTION_ID, personaSelection);

    const learningPreferenceSelection = singleSelection(LEARNING_PREFERENCE_QUESTION_ID);
    const learningPreferenceLabel = optionLabel(LEARNING_PREFERENCE_QUESTION_ID, learningPreferenceSelection);
    const learningPreferenceScores: Record<string, number> = {
      visual: learningPreferenceSelection === 'visual_first' ? 100 : 0,
      reading: learningPreferenceSelection === 'documentation_first' ? 100 : 0,
      handsOn: learningPreferenceSelection === 'hands_on_first' ? 100 : 0,
      social: learningPreferenceSelection === 'social_first' ? 100 : 0,
    };

    const retentionSelection = singleSelection(RETENTION_TECHNIQUE_QUESTION_ID);
    const retentionLabel = optionLabel(RETENTION_TECHNIQUE_QUESTION_ID, retentionSelection);

    const debuggingSelection = singleSelection(DEBUGGING_STRATEGY_QUESTION_ID);
    const debuggingLabel = optionLabel(DEBUGGING_STRATEGY_QUESTION_ID, debuggingSelection);

    const stuckResponseSelection = singleSelection(STUCK_RESPONSE_QUESTION_ID);
    const stuckResponseLabel = optionLabel(STUCK_RESPONSE_QUESTION_ID, stuckResponseSelection);

    const growthSelection = singleSelection(GROWTH_STRATEGY_QUESTION_ID);
    const growthLabel = optionLabel(GROWTH_STRATEGY_QUESTION_ID, growthSelection);

    const planningSelection = singleSelection(PLANNING_SYSTEM_QUESTION_ID);
    const planningLabel = optionLabel(PLANNING_SYSTEM_QUESTION_ID, planningSelection);

    const availabilityEntries: Record<string, unknown> = {};
    if (hoursPerWeek !== null) {
      availabilityEntries.hoursPerWeek = hoursPerWeek;
    }
    if (timeCommitmentLabel) {
      availabilityEntries.timeCommitment = timeCommitmentLabel;
    }
    if (weeklyRhythmLabel) {
      availabilityEntries.weeklyRhythm = weeklyRhythmLabel;
    }
    if (energyPeakLabel) {
      availabilityEntries.energyPeak = energyPeakLabel;
    }
    if (focusPreferenceLabel) {
      availabilityEntries.focusPreference = {
        dominant: focusPreferenceSelection,
        label: focusPreferenceLabel,
      };
    }
    if (contextSwitchLabel) {
      availabilityEntries.contextSwitch = contextSwitchLabel;
    }
    if (noteStyleLabel) {
      availabilityEntries.noteStyle = noteStyleLabel;
    }
    if (supportLabels.length > 0) {
      availabilityEntries.supportChannels = supportLabels;
    }
    if (reviewCadenceLabel) {
      availabilityEntries.reviewCadence = reviewCadenceLabel;
    }

    const extras: Record<string, unknown> = {};

    if (hoursPerWeek !== null) {
      extras.hoursPerWeek = hoursPerWeek;
    }

    if (Object.keys(availabilityEntries).length > 0) {
      extras.availability = availabilityEntries;
    }

    if (passionTags.length > 0) {
      extras.passionTags = passionTags;
    }

    if (goals.length > 0) {
      extras.goals = goals;
    }

    if (blockers.length > 0) {
      extras.blockers = blockers;
    }

    if (personaSelection || personaLabel) {
      extras.persona = {
        key: personaSelection,
        label: personaLabel,
      };
      extras.profileType = personaLabel ?? personaSelection;
    }

    extras.learningPreferences = {
      dominant: learningPreferenceSelection,
      label: learningPreferenceLabel,
      scores: learningPreferenceScores,
    };

    if (retentionLabel) {
      extras.retentionTechniques = {
        dominant: retentionSelection,
        label: retentionLabel,
      };
    }

    if (debuggingLabel) {
      extras.debuggingStrategy = {
        dominant: debuggingSelection,
        label: debuggingLabel,
      };
    }

    if (stuckResponseLabel) {
      extras.stuckResponse = {
        defaultAction: stuckResponseLabel,
      };
    }

    if (growthLabel) {
      extras.growthStrategy = {
        approach: growthLabel,
      };
    }

    if (planningLabel) {
      extras.planningSystems = {
        preferred: planningLabel,
      };
    }

    if (supportLabels.length > 0) {
      extras.supportChannels = supportLabels;
    }

    if (reviewCadenceLabel) {
      extras.reviewCadence = reviewCadenceLabel;
    }

    if (focusPreferenceLabel) {
      extras.focusPreference = {
        dominant: focusPreferenceSelection,
        label: focusPreferenceLabel,
      };
      extras.dailyFocus = focusPreferenceLabel;
    }

    if (timeCommitmentLabel) {
      extras.timeCommitment = timeCommitmentLabel;
    }

    if (learningPreferenceLabel) {
      extras.style = learningPreferenceLabel;
    }

    if (hoursPerWeek !== null) {
      extras.level = hoursPerWeek >= 15 ? 'Committed' : hoursPerWeek >= 10 ? 'Steady' : 'Flexible';
    }

    return extras;
  }

  /**
   * Find translation for a question in the specified language
   */
  private findQuestionTranslation(question: any, language: string): any {
    if (!question.translations || !Array.isArray(question.translations)) {
      return null;
    }
    
    // Try exact language match first
    const exactMatch = question.translations.find((t: any) => t.language === language);
    if (exactMatch) {
      return exactMatch;
    }
    
    // Fallback to English
    return question.translations.find((t: any) => t.language === 'en') ?? null;
  }

  /**
   * Grade individual answer
   */
  private gradeAnswer(question: any, userAnswer: any): boolean {
    switch (question.type) {
      case 'multiple_choice':
        return this.gradeMultipleChoice(question, userAnswer);
      case 'multiple_select':
        return this.gradeMultipleSelect(question, userAnswer);
      case 'true_false':
        return this.gradeTrueFalse(question, userAnswer);
      case 'code_output':
        return this.gradeCodeOutput(question, userAnswer);
      case 'code_completion':
      case 'short_answer':
        // These require manual grading or more sophisticated checking
        return false; // Default to incorrect, will need manual review
      default:
        return false;
    }
  }

  /**
   * Grade multiple choice question
   */
  private gradeMultipleChoice(question: any, userAnswer: any): boolean {
    if (!question.options) return false;

    const correctOption = question.options.find((opt: any) => opt.isCorrect);

    if (!correctOption) {
      // Survey question without a keyed correct answer; accept any provided choice
      return typeof userAnswer === 'string' ? userAnswer.length > 0 : Boolean(userAnswer);
    }

    if (typeof userAnswer === 'string') {
      return userAnswer === correctOption.id;
    }

    if (userAnswer && typeof userAnswer === 'object' && 'optionId' in userAnswer) {
      return userAnswer.optionId === correctOption.id;
    }

    return false;
  }

  /**
   * Grade multiple select question
   */
  private gradeMultipleSelect(question: any, userAnswer: any): boolean {
    if (!question.options) return false;

    const correctIds = question.options
      .filter((opt: any) => opt.isCorrect)
      .map((opt: any) => opt.id)
      .sort();

    const answerIds = Array.isArray(userAnswer)
      ? [...userAnswer]
      : userAnswer && typeof userAnswer === 'object' && 'optionIds' in userAnswer && Array.isArray(userAnswer.optionIds)
        ? [...userAnswer.optionIds]
        : [];

    const userIds = answerIds.sort();

    if (correctIds.length === 0) {
      // No keyed correct answers; treat any response as acceptable
      return userIds.length > 0;
    }

    return JSON.stringify(correctIds) === JSON.stringify(userIds);
  }

  /**
   * Grade true/false question
   */
  private gradeTrueFalse(question: any, userAnswer: any): boolean {
    if (!question.options) return false;

    const correctOption = question.options.find((opt: any) => opt.isCorrect);
    return correctOption && userAnswer === correctOption.id;
  }

  /**
   * Grade code output question
   */
  private gradeCodeOutput(question: any, userAnswer: any): boolean {
    if (!question.expectedOutput || !userAnswer) return false;

    // Normalize whitespace and compare
    const expected = question.expectedOutput.trim().replace(/\s+/g, ' ');
    const actual = String(userAnswer).trim().replace(/\s+/g, ' ');

    return expected === actual;
  }

  /**
   * Check if user can progress (post-sprint quiz)
   */
  async validateSprintCompletion(params: {
    userId: string;
    sprintId: string;
  }): Promise<ProgressionCheck> {
    const { userId, sprintId } = params;

    // Get sprint with post-sprint quiz
    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        quizzes: {
          where: { type: 'post_sprint' },
          include: {
            attempts: {
              where: { userId },
              orderBy: { attemptNumber: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!sprint) {
      throw new Error(`Sprint ${sprintId} not found`);
    }

    const postSprintQuiz = sprint.quizzes.find((q) => q.type === 'post_sprint');

    if (!postSprintQuiz) {
      // No post-sprint quiz required
      return {
        canProgress: true,
        requiredScore: 0,
      };
    }

    const latestAttempt = postSprintQuiz.attempts[0];

    if (!latestAttempt) {
      return {
        canProgress: false,
        reason: 'You must complete the validation quiz before progressing.',
        requiredScore: postSprintQuiz.passingScore,
      };
    }

    if (!latestAttempt.passed) {
      const attemptsRemaining = postSprintQuiz.attemptsAllowed - latestAttempt.attemptNumber;

      return {
        canProgress: false,
        reason: `Quiz score (${latestAttempt.score}%) is below passing score (${postSprintQuiz.passingScore}%).`,
        quizScore: latestAttempt.score,
        requiredScore: postSprintQuiz.passingScore,
        attemptsRemaining,
      };
    }

    return {
      canProgress: true,
      quizScore: latestAttempt.score,
      requiredScore: postSprintQuiz.passingScore,
    };
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Generate quiz title
   */
  private generateQuizTitle(type: QuizType, skills: any[]): string {
    const skillNames = skills.slice(0, 2).map((s) => s.name).join(' & ');
    const more = skills.length > 2 ? ` +${skills.length - 2} more` : '';

    const titles: Record<QuizType, string> = {
      pre_sprint: `Readiness Check: ${skillNames}${more}`,
      post_sprint: `Validation Quiz: ${skillNames}${more}`,
      skill_check: `Skill Assessment: ${skillNames}${more}`,
      review: `Review Quiz: ${skillNames}${more}`,
      milestone: `Milestone Assessment: ${skillNames}${more}`,
    };

    return titles[type];
  }

  /**
   * Generate quiz description
   */
  private generateQuizDescription(type: QuizType, skills: any[]): string {
    const descriptions: Record<QuizType, string> = {
      pre_sprint: 'Test your prerequisite knowledge before starting this sprint.',
      post_sprint: 'Validate your understanding of the concepts covered in this sprint.',
      skill_check: 'Assess your current proficiency in these skills.',
      review: 'Review previously learned skills to ensure retention.',
      milestone: 'Comprehensive assessment of all skills learned up to this point.',
    };

    return descriptions[type];
  }

  /**
   * Generate recommendations based on quiz results
   */
  private generateRecommendations(params: {
    score: number;
    passed: boolean;
    weakAreas: string[];
    skillScores: Record<string, number>;
  }): string[] {
    const { score, passed, weakAreas } = params;
    const recommendations: string[] = [];

    if (passed) {
      if (score >= 95) {
        recommendations.push('Excellent work! You have mastered these concepts.');
      } else if (score >= 85) {
        recommendations.push('Great job! You have a solid understanding.');
      } else {
        recommendations.push('Good work! You passed, but there is room for improvement.');
      }
    } else {
      recommendations.push('Review the material and try again.');
    }

    if (weakAreas.length > 0) {
      recommendations.push(`Focus on improving: ${weakAreas.slice(0, 3).join(', ')}`);
      recommendations.push('Practice more exercises in these areas.');
    }

    return recommendations;
  }
}

export default new KnowledgeValidationService();
