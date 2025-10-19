export type FeatureName =
  | 'ai_mentor_chat'
  | 'roadmap_creation'
  | 'unlimited_resources'
  | 'coaching_sessions'
  | 'priority_support'
  | 'career_guidance';

export const FEATURE_NAMES: FeatureName[] = [
  'ai_mentor_chat',
  'roadmap_creation',
  'unlimited_resources',
  'coaching_sessions',
  'priority_support',
  'career_guidance',
];

export interface FeatureEntitlement {
  enabled: boolean;
  unlimited: boolean;
  limit: number | null;
  metadata?: Record<string, unknown>;
}

export type FeatureEntitlements = Record<FeatureName, FeatureEntitlement>;
