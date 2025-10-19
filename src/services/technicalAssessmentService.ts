import fs from 'fs';
import path from 'path';
import { Prisma } from '@prisma/client';
import { AppError } from '../errors/AppError';
import { learnerProfileService } from './profile';
import { profileContextBuilder } from './profileContextBuilder.js';
import { technicalAssessmentConfig, TechnicalAssessmentQuestion } from '../config/technicalAssessment.js';

export type TechnicalAssessmentAnswers = {
  codingExperience: 'absolute_beginner' | 'beginner' | 'intermediate' | 'advanced';
  toolExperience: string[];
  programmingConcepts: string[];
  projectExperience: number;
  environmentCheck: string[];
};

export interface TechnicalAssessmentScore {
  overall: 'absolute_beginner' | 'beginner' | 'intermediate' | 'advanced';
  score: number;
  breakdown: {
    coding: number;
    tools: number;
    concepts: number;
    autonomy: number;
  };
  flags: {
    needsEnvironmentSetup: boolean;
    needsTerminalIntro: boolean;
    needsGitIntro: boolean;
    hasProjectExperience: boolean;
    canWorkIndependently: boolean;
  };
  assessedAt: string;
  version: number;
}

export interface SubmitTechnicalAssessmentParams {
  userId: string;
  answers: TechnicalAssessmentAnswers;
  version?: number;
}

type TechnicalAssessmentLocaleOption = {
  label?: string;
  helperText?: string;
};

type TechnicalAssessmentLocaleQuestion = {
  prompt?: string;
  description?: string;
  options?: Record<string, TechnicalAssessmentLocaleOption>;
  items?: Record<string, TechnicalAssessmentLocaleOption>;
};

type TechnicalAssessmentLocaleBundle = {
  questions?: Record<string, TechnicalAssessmentLocaleQuestion>;
};

const loadTechnicalAssessmentLocale = (language: string): TechnicalAssessmentLocaleBundle | null => {
  const normalized = language.toLowerCase();
  const filePath = path.resolve(process.cwd(), `src/locales/${normalized}/technicalAssessment.json`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as TechnicalAssessmentLocaleBundle;
  } catch (error) {
    console.warn(`[technicalAssessment] Failed to read locale file: ${filePath}`, error);
    return null;
  }
};

const createLocalizedQuestion = (
  question: TechnicalAssessmentQuestion,
  languageBundle: TechnicalAssessmentLocaleBundle | null,
  fallbackBundle: TechnicalAssessmentLocaleBundle | null
): TechnicalAssessmentQuestion => {
  const localizedQuestion: TechnicalAssessmentQuestion = JSON.parse(JSON.stringify(question));

  const applyBundle = (bundle: TechnicalAssessmentLocaleBundle | null) => {
    if (!bundle?.questions) {
      return;
    }

    const localeQuestion = bundle.questions[question.id];
    if (!localeQuestion) {
      return;
    }

    if (localeQuestion.prompt) {
      localizedQuestion.prompt = localeQuestion.prompt;
    }

    if (localeQuestion.description) {
      localizedQuestion.description = localeQuestion.description;
    }

    if ('options' in localizedQuestion && Array.isArray(localizedQuestion.options)) {
      localizedQuestion.options = localizedQuestion.options.map((option) => {
        const optionKey = String(option.value);
        const optionLocale = localeQuestion.options?.[optionKey];

        return {
          ...option,
          ...(optionLocale?.label ? { label: optionLocale.label } : {}),
          ...(optionLocale?.helperText !== undefined ? { helperText: optionLocale.helperText } : {}),
        };
      });
    }

    if ('items' in localizedQuestion && Array.isArray((localizedQuestion as any).items)) {
      const items = (localizedQuestion as any).items;
      localizedQuestion.items = items.map((item: { id: string; label: string; helperText?: string }) => {
        const itemLocale = localeQuestion.items?.[item.id];

        return {
          ...item,
          ...(itemLocale?.label ? { label: itemLocale.label } : {}),
          ...(itemLocale?.helperText !== undefined ? { helperText: itemLocale.helperText } : {}),
        };
      });
    }
  };

  applyBundle(fallbackBundle);
  applyBundle(languageBundle);

  return localizedQuestion;
};

class TechnicalAssessmentService {
  getQuestions(language: string = 'en'): { version: number; questions: TechnicalAssessmentQuestion[] } {
    const normalizedLanguage = language.toLowerCase();
    const languageBundle = loadTechnicalAssessmentLocale(normalizedLanguage);
    const fallbackBundle = normalizedLanguage === 'en'
      ? languageBundle
      : loadTechnicalAssessmentLocale('en');

    const questions = technicalAssessmentConfig.questions.map((question) =>
      createLocalizedQuestion(question, languageBundle, fallbackBundle)
    );

    return {
      version: technicalAssessmentConfig.version,
      questions
    };
  }

  async submitAssessment(params: SubmitTechnicalAssessmentParams): Promise<{
    version: number;
    score: TechnicalAssessmentScore;
  }> {
    const { userId, answers } = params;
    const version = params.version ?? technicalAssessmentConfig.version;

    if (version !== technicalAssessmentConfig.version) {
      throw new AppError('technicalAssessment.errors.unsupportedVersion', 400, 'TECH_ASSESSMENT_VERSION_MISMATCH');
    }

    const profile = await learnerProfileService.getLatestProfileForUser(userId);

    if (!profile) {
      throw new AppError('technicalAssessment.errors.profileRequired', 400, 'LEARNER_PROFILE_REQUIRED');
    }

    const score = this.calculateScore(answers, version);
    const updatedSnapshot = this.mergeRawSnapshot(profile.rawSnapshot, {
      technicalAssessment: {
        version,
        assessedAt: score.assessedAt,
        answers,
        score
      }
    });

    await learnerProfileService.updateSnapshot(
      profile.id,
      {
        rawSnapshot: updatedSnapshot as Prisma.JsonValue,
        technicalLevel: score as unknown as Prisma.JsonValue,
        assessmentVersion: `technical-${version}`,
        assessmentCompletedAt: new Date(score.assessedAt)
      },
      {
        trigger: 'system',
        metadata: {
          source: 'technicalAssessment'
        }
      }
    );

    // Emit context refresh to ensure downstream consumers receive updated profile context
    await profileContextBuilder.build({
      userId,
      learnerProfileId: profile.id,
      includeQuizResult: false,
      includeProgress: false
    }).catch((error) => {
      // Non-blocking: log and continue
      console.warn('[technicalAssessment] failed to rebuild profile context', { userId, error });
    });

    return {
      version,
      score
    };
  }

  private calculateScore(answers: TechnicalAssessmentAnswers, version: number): TechnicalAssessmentScore {
    const codingMap: Record<TechnicalAssessmentAnswers['codingExperience'], number> = {
      absolute_beginner: 0,
      beginner: 1,
      intermediate: 2,
      advanced: 3
    };

    const normalizedToolExperience = answers.toolExperience.includes('none')
      ? []
      : answers.toolExperience.filter((tool) => tool !== 'none');

    const normalizedConcepts = answers.programmingConcepts.includes('none')
      ? []
      : answers.programmingConcepts.filter((concept) => concept !== 'none');

    const codingScore = codingMap[answers.codingExperience] * 2.5;
    const toolsScore = Math.min(10, (normalizedToolExperience.length / 4) * 10);
    const conceptsScore = Math.min(10, (normalizedConcepts.length / 6) * 10);
    const autonomyScore = Math.min(10, answers.projectExperience * 2.5);

    const overallScoreRaw = (codingScore + toolsScore + conceptsScore + autonomyScore) / 4;
    const overallScore = Math.round(overallScoreRaw * 100) / 100;

    const determineLevel = (): TechnicalAssessmentScore['overall'] => {
      if (overallScore < 2) return 'absolute_beginner';
      if (overallScore < 5) return 'beginner';
      if (overallScore < 8) return 'intermediate';
      return 'advanced';
    };

    const environment = new Set(answers.environmentCheck);

    const flags: TechnicalAssessmentScore['flags'] = {
      needsEnvironmentSetup: toolsScore < 2 || !environment.has('hasCodeEditor'),
      needsTerminalIntro: !environment.has('terminalComfortable'),
      needsGitIntro: !normalizedToolExperience.includes('git'),
      hasProjectExperience: autonomyScore > 0,
      canWorkIndependently: answers.projectExperience >= 2
    };

    const assessedAt = new Date().toISOString();

    return {
      overall: determineLevel(),
      score: overallScore,
      breakdown: {
        coding: Math.round(codingScore * 100) / 100,
        tools: Math.round(toolsScore * 100) / 100,
        concepts: Math.round(conceptsScore * 100) / 100,
        autonomy: Math.round(autonomyScore * 100) / 100
      },
      flags,
      assessedAt,
      version
    };
  }

  private mergeRawSnapshot(
    rawSnapshot: Prisma.JsonValue,
    patch: Record<string, unknown>
  ): Record<string, unknown> {
    const base: Record<string, unknown> = rawSnapshot && typeof rawSnapshot === 'object'
      ? JSON.parse(JSON.stringify(rawSnapshot))
      : {};

    return {
      ...base,
      ...patch
    };
  }
}

export const technicalAssessmentService = new TechnicalAssessmentService();
export default technicalAssessmentService;
