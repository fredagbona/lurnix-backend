import type { PlanType } from '../prisma/prismaTypes';

export type PlanLimitReason = 'objective_limit' | 'sprint_limit';

export interface PlanLimitsPayload {
  planType: PlanType;
  objectiveLimit: number | null;
  objectiveCount: number;
  remainingObjectives: number | null;
  canCreateObjective: boolean;
  gatingReason: PlanLimitReason | null;
  gatingMessageKey: string | null;
  upgradePlanType: PlanType | null;
}

export interface ObjectiveSprintLimitPayload {
  planType: PlanType;
  sprintLimitPerObjective: number | null;
  sprintCount: number;
  remainingSprints: number | null;
  canGenerateSprint: boolean;
  gatingReason: PlanLimitReason | null;
  gatingMessageKey: string | null;
  upgradePlanType: PlanType | null;
}
