export interface QuizPersonalityDimensions {
  learning_style: string[];
  problem_approach: string[];
  motivation_type: string[];
  resilience_style: string[];
  tech_affinity: string[];
  focus_preference: string[];
  planning_style: string[];
  accountability_style: string[];
}

export interface QuizProfileMapping {
  primary: string[];
  secondary: string[];
  tech_preference: string[];
}

export const quizPersonalityDimensions: QuizPersonalityDimensions = {
  learning_style: ['visual', 'analytical', 'practical', 'social', 'intuitive'],
  problem_approach: ['systematic', 'experimental', 'collaborative', 'independent'],
  motivation_type: ['impact_driven', 'freedom_seeking', 'intellectually_curious', 'creatively_expressive', 'socially_connected'],
  resilience_style: ['persistent_fighter', 'strategic_thinker', 'collaborative_solver', 'adaptive_learner'],
  tech_affinity: ['frontend', 'backend', 'fullstack', 'data_science', 'ai_ml', 'mobile', 'gamedev', 'security'],
  focus_preference: ['focus_micro', 'focus_steady', 'focus_deep', 'focus_flexible'],
  planning_style: ['planner_daily', 'planner_weekly', 'planner_kanban', 'planner_flexible'],
  accountability_style: ['accountability_public', 'accountability_circle', 'accountability_self', 'accountability_mentor']
};

export const quizProfileMapping: Record<string, QuizProfileMapping> = {
  VISUAL_LEARNER: {
    primary: ['visual', 'creative'],
    secondary: ['systematic', 'perfectionist'],
    tech_preference: ['frontend', 'gamedev', 'mobile']
  },
  PRACTICAL_BUILDER: {
    primary: ['practical', 'experimental'],
    secondary: ['efficient', 'ambitious'],
    tech_preference: ['fullstack', 'mobile', 'backend']
  },
  ANALYTICAL_THINKER: {
    primary: ['analytical', 'systematic'],
    secondary: ['perfectionist', 'independent'],
    tech_preference: ['backend', 'data_science', 'ai_ml', 'security']
  },
  SOCIAL_COLLABORATOR: {
    primary: ['social', 'collaborative'],
    secondary: ['altruist', 'adaptive'],
    tech_preference: ['frontend', 'fullstack']
  },
  CREATIVE_EXPLORER: {
    primary: ['creative', 'innovative'],
    secondary: ['experimental', 'curious'],
    tech_preference: ['frontend', 'gamedev', 'ai_ml']
  },
  STRUCTURED_PLANNER: {
    primary: ['systematic', 'methodical'],
    secondary: ['perfectionist', 'analytical'],
    tech_preference: ['backend', 'data_science', 'security']
  },
  INDEPENDENT_RESEARCHER: {
    primary: ['independent', 'analytical'],
    secondary: ['persistent', 'methodical'],
    tech_preference: ['backend', 'ai_ml', 'security']
  },
  GOAL_ORIENTED_ACHIEVER: {
    primary: ['ambitious', 'practical'],
    secondary: ['efficient', 'persistent'],
    tech_preference: ['fullstack', 'mobile', 'backend']
  }
};

export const quizProfileSummaryKey = (profileKey: string): string => `quiz.profiles.${profileKey}.summary`;
export const quizProfileNameKey = (profileKey: string): string => `quiz.profiles.${profileKey}.name`;
