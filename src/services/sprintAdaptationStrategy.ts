import type { ObjectiveContext } from '../types/prisma';
import type { TechnicalAssessmentScore } from './technicalAssessmentService.js';

export type AdaptiveStrategy =
  | 'absolute_beginner'
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'accelerated';

export type AdaptiveLevel = 'absolute_beginner' | 'beginner' | 'intermediate' | 'advanced';

export type AdaptiveUrgency = 'low' | 'medium' | 'high';

export interface AdaptiveInputs {
  technicalLevelScore?: number;
  hoursPerWeek?: number;
  timeCommitmentHours?: number;
  urgency?: AdaptiveUrgency;
  needsEnvironmentSetup?: boolean;
  needsTerminalIntro?: boolean;
  performanceTrend?: 'improving' | 'stable' | 'declining';
}

export interface AdaptivePlanMetadata {
  strategy: AdaptiveStrategy;
  userLevel: AdaptiveLevel;
  inputs: AdaptiveInputs;
  adjustmentsApplied: string[];
  confidence: number;
  computedAt: string;
  computedBy: 'server';
}

export interface AdaptiveMetadataSignals {
  technicalAssessment?: TechnicalAssessmentScore | null;
  hoursPerWeek?: number | null;
  objectiveContext?: ObjectiveContext | null;
  performanceTrend?: 'improving' | 'stable' | 'declining';
  performanceAverageScore?: number | null;
  generatedAt?: Date;
}

export const DEFAULT_ADAPTIVE_METADATA: AdaptivePlanMetadata = {
  strategy: 'beginner',
  userLevel: 'beginner',
  inputs: {},
  adjustmentsApplied: [],
  confidence: 0.3,
  computedAt: new Date(0).toISOString(),
  computedBy: 'server'
};

export function generateAdaptiveMetadata(signals: AdaptiveMetadataSignals): AdaptivePlanMetadata {
  const {
    technicalAssessment = null,
    hoursPerWeek = null,
    objectiveContext = null,
    performanceTrend,
    performanceAverageScore,
    generatedAt
  } = signals;

  const userLevel: AdaptiveLevel = normalizeLevel(technicalAssessment?.overall);
  const urgency = normalizeUrgency(objectiveContext?.urgency);
  const timeCommitmentHours = normalizeNumber(objectiveContext?.timeCommitmentHours);
  const needsEnvironmentSetup = Boolean(technicalAssessment?.flags?.needsEnvironmentSetup ?? false);
  const needsTerminalIntro = Boolean(technicalAssessment?.flags?.needsTerminalIntro ?? false);

  const strategy = resolveStrategy({ userLevel, urgency, needsEnvironmentSetup, performanceTrend });

  const adjustmentsApplied = buildAdjustments({
    needsEnvironmentSetup,
    needsTerminalIntro,
    performanceTrend,
    performanceAverageScore,
    urgency,
    timeCommitmentHours
  });

  let confidence = 0.3;
  if (technicalAssessment) {
    confidence += 0.2;
  }
  if (objectiveContext && (objectiveContext.urgency || objectiveContext.timeCommitmentHours)) {
    confidence += 0.2;
  }
  if (performanceTrend) {
    confidence += 0.2;
  }
  confidence = Math.min(confidence, 0.95);

  const inputs: AdaptiveInputs = {
    technicalLevelScore: typeof technicalAssessment?.score === 'number' ? technicalAssessment.score : undefined,
    hoursPerWeek: normalizeNumber(hoursPerWeek),
    timeCommitmentHours,
    urgency,
    needsEnvironmentSetup,
    needsTerminalIntro,
    performanceTrend
  };

  return {
    strategy,
    userLevel,
    inputs,
    adjustmentsApplied,
    confidence,
    computedAt: (generatedAt ?? new Date()).toISOString(),
    computedBy: 'server'
  };
}

function normalizeLevel(level?: string | null): AdaptiveLevel {
  if (level === 'absolute_beginner' || level === 'beginner' || level === 'intermediate' || level === 'advanced') {
    return level;
  }
  return 'beginner';
}

function normalizeUrgency(value?: string | null): AdaptiveUrgency | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (['high', 'urgent', 'rush', 'asap', 'immediate'].some((token) => normalized.includes(token))) {
    return 'high';
  }
  if (['medium', 'normal', 'standard'].some((token) => normalized.includes(token))) {
    return 'medium';
  }
  if (['low', 'flexible', 'relaxed'].some((token) => normalized.includes(token))) {
    return 'low';
  }
  return undefined;
}

function normalizeNumber(value?: number | null): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return undefined;
}

function resolveStrategy(params: {
  userLevel: AdaptiveLevel;
  urgency?: AdaptiveUrgency;
  needsEnvironmentSetup: boolean;
  performanceTrend?: 'improving' | 'stable' | 'declining';
}): AdaptiveStrategy {
  const { userLevel, urgency, needsEnvironmentSetup, performanceTrend } = params;

  if (userLevel === 'absolute_beginner') {
    return 'absolute_beginner';
  }

  if (userLevel === 'advanced' && urgency === 'high') {
    return 'accelerated';
  }

  if (needsEnvironmentSetup && userLevel === 'beginner') {
    return 'absolute_beginner';
  }

  if (performanceTrend === 'declining') {
    return 'beginner';
  }

  return userLevel;
}

function buildAdjustments(params: {
  needsEnvironmentSetup: boolean;
  needsTerminalIntro: boolean;
  performanceTrend?: 'improving' | 'stable' | 'declining';
  performanceAverageScore?: number | null;
  urgency?: AdaptiveUrgency;
  timeCommitmentHours?: number;
}): string[] {
  const {
    needsEnvironmentSetup,
    needsTerminalIntro,
    performanceTrend,
    performanceAverageScore,
    urgency,
    timeCommitmentHours
  } = params;

  const notes: string[] = [];

  if (needsEnvironmentSetup) {
    notes.push('Includes environment setup tasks.');
  }

  if (needsTerminalIntro) {
    notes.push('Adds terminal basics resources.');
  }

  if (performanceTrend === 'declining') {
    notes.push('Pacing slowed due to recent performance.');
  } else if (performanceTrend === 'improving') {
    notes.push('Maintains pace with improving performance trend.');
  }

  if (typeof performanceAverageScore === 'number') {
    notes.push(`Calibrated for average sprint score of ${Math.round(performanceAverageScore)}%.`);
  }

  if (urgency === 'high') {
    notes.push('Compressed schedule for high urgency objective.');
  }

  if (typeof timeCommitmentHours === 'number' && timeCommitmentHours < 10) {
    notes.push('Reduced workload to respect limited weekly availability.');
  }

  return notes;
}
