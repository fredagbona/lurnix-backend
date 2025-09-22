export interface QuizOptionContent {
  labelKey: string;
  value: string;
  weights?: Record<string, number>;
}

export interface QuizQuestionContent {
  key: string;
  type: 'single' | 'multi' | 'scale' | 'rank';
  sortOrder: number;
  version: number;
  isActive?: boolean;
  sectionId?: string;
  titleKey: string;
  descriptionKey?: string;
  weightCategory?: string;
  options: QuizOptionContent[];
}

export interface QuizSectionContent {
  key: string;
  sortOrder: number;
  version: number;
  isActive?: boolean;
  titleKey: string;
  descriptionKey?: string;
  questions: QuizQuestionContent[];
}

export const QUIZ_VERSION = 2;

const makeQuestion = (data: Omit<QuizQuestionContent, 'version' | 'isActive'> & { isActive?: boolean }): QuizQuestionContent => ({
  version: QUIZ_VERSION,
  isActive: true,
  ...data
});

export const quizSectionsContent: QuizSectionContent[] = [
  {
    key: 'learning_style_insights',
    sortOrder: 1,
    version: QUIZ_VERSION,
    isActive: true,
    titleKey: 'quiz.sections.learningStyle.title',
    descriptionKey: 'quiz.sections.learningStyle.description',
    questions: [
      makeQuestion({
        key: 'new_framework_scenario',
        type: 'single',
        sortOrder: 1,
        titleKey: 'quiz.questions.new_framework_scenario.title',
        descriptionKey: 'quiz.questions.new_framework_scenario.description',
        options: [
          {
            labelKey: 'quiz.questions.new_framework_scenario.options.visual_first',
            value: 'visual_first',
            weights: { visual: 3, practical: 2, analytical: 1 }
          },
          {
            labelKey: 'quiz.questions.new_framework_scenario.options.documentation_first',
            value: 'documentation_first',
            weights: { analytical: 3, visual: 1, practical: 1 }
          },
          {
            labelKey: 'quiz.questions.new_framework_scenario.options.hands_on_first',
            value: 'hands_on_first',
            weights: { practical: 3, visual: 1, analytical: 1 }
          },
          {
            labelKey: 'quiz.questions.new_framework_scenario.options.social_first',
            value: 'social_first',
            weights: { social: 3, visual: 2, practical: 1 }
          }
        ]
      }),
      makeQuestion({
        key: 'bug_hunting_preference',
        type: 'single',
        sortOrder: 2,
        titleKey: 'quiz.questions.bug_hunting_preference.title',
        descriptionKey: 'quiz.questions.bug_hunting_preference.description',
        options: [
          {
            labelKey: 'quiz.questions.bug_hunting_preference.options.analytical_debug',
            value: 'analytical_debug',
            weights: { analytical: 3, systematic: 3, intuitive: 1 }
          },
          {
            labelKey: 'quiz.questions.bug_hunting_preference.options.experimental_debug',
            value: 'experimental_debug',
            weights: { practical: 3, intuitive: 2, systematic: 1, experimental: 3 }
          },
          {
            labelKey: 'quiz.questions.bug_hunting_preference.options.community_debug',
            value: 'community_debug',
            weights: { social: 3, practical: 1, analytical: 1, collaborative: 3 }
          },
          {
            labelKey: 'quiz.questions.bug_hunting_preference.options.reflective_debug',
            value: 'reflective_debug',
            weights: { intuitive: 3, analytical: 1, social: 1, independent: 2 }
          }
        ]
      }),
      makeQuestion({
        key: 'learning_retention',
        type: 'single',
        sortOrder: 3,
        titleKey: 'quiz.questions.learning_retention.title',
        descriptionKey: 'quiz.questions.learning_retention.description',
        options: [
          {
            labelKey: 'quiz.questions.learning_retention.options.visual_memory',
            value: 'visual_memory',
            weights: { visual: 3, practical: 1 }
          },
          {
            labelKey: 'quiz.questions.learning_retention.options.practical_memory',
            value: 'practical_memory',
            weights: { practical: 3, visual: 1, experimental: 2 }
          },
          {
            labelKey: 'quiz.questions.learning_retention.options.social_memory',
            value: 'social_memory',
            weights: { social: 3, analytical: 2, collaborative: 2 }
          },
          {
            labelKey: 'quiz.questions.learning_retention.options.analytical_memory',
            value: 'analytical_memory',
            weights: { analytical: 3, visual: 1 }
          }
        ]
      }),
      makeQuestion({
        key: 'project_approach',
        type: 'single',
        sortOrder: 4,
        titleKey: 'quiz.questions.project_approach.title',
        descriptionKey: 'quiz.questions.project_approach.description',
        options: [
          {
            labelKey: 'quiz.questions.project_approach.options.ui_first',
            value: 'ui_first',
            weights: { visual: 3, creative: 2, systematic: 1, experimental: 1 }
          },
          {
            labelKey: 'quiz.questions.project_approach.options.architecture_first',
            value: 'architecture_first',
            weights: { analytical: 3, systematic: 3, creative: 1 }
          },
          {
            labelKey: 'quiz.questions.project_approach.options.mvp_first',
            value: 'mvp_first',
            weights: { practical: 3, creative: 1, systematic: 1, experimental: 2 }
          },
          {
            labelKey: 'quiz.questions.project_approach.options.research_first',
            value: 'research_first',
            weights: { analytical: 2, social: 1, systematic: 2, collaborative: 2 }
          }
        ]
      })
    ]
  },
  {
    key: 'deep_motivations',
    sortOrder: 2,
    version: QUIZ_VERSION,
    isActive: true,
    titleKey: 'quiz.sections.motivations.title',
    descriptionKey: 'quiz.sections.motivations.description',
    questions: [
      makeQuestion({
        key: 'coding_dream',
        type: 'single',
        sortOrder: 1,
        titleKey: 'quiz.questions.coding_dream.title',
        descriptionKey: 'quiz.questions.coding_dream.description',
        options: [
          {
            labelKey: 'quiz.questions.coding_dream.options.impact_global',
            value: 'impact_global',
            weights: { altruist: 3, ambitious: 2, practical: 1, impact_driven: 3 }
          },
          {
            labelKey: 'quiz.questions.coding_dream.options.freedom_lifestyle',
            value: 'freedom_lifestyle',
            weights: { independence: 3, practical: 2, ambitious: 2, freedom_seeking: 3 }
          },
          {
            labelKey: 'quiz.questions.coding_dream.options.intellectual_challenge',
            value: 'intellectual_challenge',
            weights: { analytical: 3, perfectionist: 2, practical: 1, intellectually_curious: 3 }
          },
          {
            labelKey: 'quiz.questions.coding_dream.options.creative_expression',
            value: 'creative_expression',
            weights: { creative: 3, visual: 2, perfectionist: 1, creatively_expressive: 3 }
          },
          {
            labelKey: 'quiz.questions.coding_dream.options.team_growth',
            value: 'team_growth',
            weights: { social: 3, analytical: 1, ambitious: 2, socially_connected: 3 }
          }
        ]
      }),
      makeQuestion({
        key: 'frustration_trigger',
        type: 'single',
        sortOrder: 2,
        titleKey: 'quiz.questions.frustration_trigger.title',
        descriptionKey: 'quiz.questions.frustration_trigger.description',
        options: [
          {
            labelKey: 'quiz.questions.frustration_trigger.options.impatient_practical',
            value: 'impatient_practical',
            weights: { practical: 3, impatient: 2, analytical: -1 }
          },
          {
            labelKey: 'quiz.questions.frustration_trigger.options.need_theory',
            value: 'need_theory',
            weights: { analytical: 3, systematic: 2, practical: -1 }
          },
          {
            labelKey: 'quiz.questions.frustration_trigger.options.need_examples',
            value: 'need_examples',
            weights: { visual: 3, practical: 2, analytical: 1 }
          },
          {
            labelKey: 'quiz.questions.frustration_trigger.options.need_time',
            value: 'need_time',
            weights: { methodical: 3, reflective: 2, impatient: -2 }
          },
          {
            labelKey: 'quiz.questions.frustration_trigger.options.need_community',
            value: 'need_community',
            weights: { social: 3, independent: -1, collaborative: 2 }
          }
        ]
      }),
      makeQuestion({
        key: 'success_feeling',
        type: 'single',
        sortOrder: 3,
        titleKey: 'quiz.questions.success_feeling.title',
        descriptionKey: 'quiz.questions.success_feeling.description',
        options: [
          {
            labelKey: 'quiz.questions.success_feeling.options.clean_execution',
            value: 'clean_execution',
            weights: { perfectionist: 3, analytical: 2 }
          },
          {
            labelKey: 'quiz.questions.success_feeling.options.completion_focus',
            value: 'completion_focus',
            weights: { practical: 3, ambitious: 2, perfectionist: -1 }
          },
          {
            labelKey: 'quiz.questions.success_feeling.options.teaching_satisfaction',
            value: 'teaching_satisfaction',
            weights: { social: 3, altruist: 2, analytical: 1 }
          },
          {
            labelKey: 'quiz.questions.success_feeling.options.problem_solving_satisfaction',
            value: 'problem_solving_satisfaction',
            weights: { analytical: 3, persistent: 2, perfectionist: 1 }
          },
          {
            labelKey: 'quiz.questions.success_feeling.options.innovation_satisfaction',
            value: 'innovation_satisfaction',
            weights: { creative: 3, intuitive: 2, analytical: 1 }
          }
        ]
      }),
      makeQuestion({
        key: 'time_availability',
        type: 'single',
        sortOrder: 4,
        titleKey: 'quiz.questions.time_availability.title',
        descriptionKey: 'quiz.questions.time_availability.description',
        options: [
          {
            labelKey: 'quiz.questions.time_availability.options.intensive_time',
            value: 'intensive_time',
            weights: { intensive: 3, ambitious: 2 }
          },
          {
            labelKey: 'quiz.questions.time_availability.options.balanced_time',
            value: 'balanced_time',
            weights: { balanced: 3, methodical: 2 }
          },
          {
            labelKey: 'quiz.questions.time_availability.options.constrained_time',
            value: 'constrained_time',
            weights: { efficient: 3, practical: 2, balanced: 1 }
          },
          {
            labelKey: 'quiz.questions.time_availability.options.irregular_time',
            value: 'irregular_time',
            weights: { flexible: 3, adaptive: 2 }
          }
        ]
      })
    ]
  },
  {
    key: 'tech_passions',
    sortOrder: 3,
    version: QUIZ_VERSION,
    isActive: true,
    titleKey: 'quiz.sections.techPassions.title',
    descriptionKey: 'quiz.sections.techPassions.description',
    questions: [
      makeQuestion({
        key: 'demo_excitement',
        type: 'single',
        sortOrder: 1,
        titleKey: 'quiz.questions.demo_excitement.title',
        descriptionKey: 'quiz.questions.demo_excitement.description',
        options: [
          {
            labelKey: 'quiz.questions.demo_excitement.options.ui_excitement',
            value: 'ui_excitement',
            weights: { frontend: 3, visual: 3, creative: 2 }
          },
          {
            labelKey: 'quiz.questions.demo_excitement.options.ai_excitement',
            value: 'ai_excitement',
            weights: { ai_ml: 3, analytical: 2, innovative: 3 }
          },
          {
            labelKey: 'quiz.questions.demo_excitement.options.data_excitement',
            value: 'data_excitement',
            weights: { data_science: 3, analytical: 3, visual: 1 }
          },
          {
            labelKey: 'quiz.questions.demo_excitement.options.backend_excitement',
            value: 'backend_excitement',
            weights: { backend: 3, performance: 3, analytical: 2 }
          },
          {
            labelKey: 'quiz.questions.demo_excitement.options.interactive_excitement',
            value: 'interactive_excitement',
            weights: { gamedev: 3, creative: 3, visual: 2 }
          },
          {
            labelKey: 'quiz.questions.demo_excitement.options.security_excitement',
            value: 'security_excitement',
            weights: { security: 3, analytical: 3, systematic: 2 }
          }
        ]
      }),
      makeQuestion({
        key: 'first_project_dream',
        type: 'single',
        sortOrder: 2,
        titleKey: 'quiz.questions.first_project_dream.title',
        descriptionKey: 'quiz.questions.first_project_dream.description',
        options: [
          {
            labelKey: 'quiz.questions.first_project_dream.options.mobile_app_dream',
            value: 'mobile_app_dream',
            weights: { mobile: 3, social: 2, practical: 3 }
          },
          {
            labelKey: 'quiz.questions.first_project_dream.options.website_cause_dream',
            value: 'website_cause_dream',
            weights: { frontend: 3, altruist: 3, visual: 2 }
          },
          {
            labelKey: 'quiz.questions.first_project_dream.options.automation_dream',
            value: 'automation_dream',
            weights: { backend: 2, practical: 3, efficiency: 3 }
          },
          {
            labelKey: 'quiz.questions.first_project_dream.options.game_dream',
            value: 'game_dream',
            weights: { gamedev: 3, creative: 3, visual: 2 }
          },
          {
            labelKey: 'quiz.questions.first_project_dream.options.dashboard_dream',
            value: 'dashboard_dream',
            weights: { data_science: 3, visual: 2, analytical: 2 }
          },
          {
            labelKey: 'quiz.questions.first_project_dream.options.opensource_dream',
            value: 'opensource_dream',
            weights: { backend: 2, social: 3, altruist: 2 }
          }
        ]
      }),
      makeQuestion({
        key: 'tech_personality',
        type: 'single',
        sortOrder: 3,
        titleKey: 'quiz.questions.tech_personality.title',
        descriptionKey: 'quiz.questions.tech_personality.description',
        options: [
          {
            labelKey: 'quiz.questions.tech_personality.options.designer_dev',
            value: 'designer_dev',
            weights: { frontend: 3, visual: 3, creative: 2, perfectionist: 2 }
          },
          {
            labelKey: 'quiz.questions.tech_personality.options.speed_runner',
            value: 'speed_runner',
            weights: { practical: 3, agile: 3, efficient: 2, perfectionist: -1 }
          },
          {
            labelKey: 'quiz.questions.tech_personality.options.architect',
            value: 'architect',
            weights: { backend: 3, systematic: 3, analytical: 2, perfectionist: 2 }
          },
          {
            labelKey: 'quiz.questions.tech_personality.options.innovator',
            value: 'innovator',
            weights: { innovative: 3, experimental: 3, adaptive: 2, systematic: -1 }
          },
          {
            labelKey: 'quiz.questions.tech_personality.options.problem_solver',
            value: 'problem_solver',
            weights: { analytical: 3, persistent: 3, perfectionist: 2, social: -1 }
          },
          {
            labelKey: 'quiz.questions.tech_personality.options.team_player',
            value: 'team_player',
            weights: { social: 3, collaborative: 3, altruist: 2, independent: -1 }
          }
        ]
      })
    ]
  },
  {
    key: 'challenge_response',
    sortOrder: 4,
    version: QUIZ_VERSION,
    isActive: true,
    titleKey: 'quiz.sections.challenges.title',
    descriptionKey: 'quiz.sections.challenges.description',
    questions: [
      makeQuestion({
        key: 'stuck_reaction',
        type: 'single',
        sortOrder: 1,
        titleKey: 'quiz.questions.stuck_reaction.title',
        descriptionKey: 'quiz.questions.stuck_reaction.description',
        options: [
          {
            labelKey: 'quiz.questions.stuck_reaction.options.persistent_fighter',
            value: 'persistent_fighter',
            weights: { persistent: 3, independent: 2, stubborn: 2, persistent_fighter: 3 }
          },
          {
            labelKey: 'quiz.questions.stuck_reaction.options.strategic_pauser',
            value: 'strategic_pauser',
            weights: { reflective: 3, intuitive: 2, balanced: 2, strategic_thinker: 3 }
          },
          {
            labelKey: 'quiz.questions.stuck_reaction.options.help_seeker',
            value: 'help_seeker',
            weights: { social: 3, collaborative: 2, efficient: 2, collaborative_solver: 3 }
          },
          {
            labelKey: 'quiz.questions.stuck_reaction.options.knowledge_builder',
            value: 'knowledge_builder',
            weights: { analytical: 3, systematic: 2, methodical: 2, strategic_thinker: 2 }
          },
          {
            labelKey: 'quiz.questions.stuck_reaction.options.pragmatic_workaround',
            value: 'pragmatic_workaround',
            weights: { practical: 3, adaptive: 2, efficient: 2, adaptive_learner: 3 }
          }
        ]
      }),
      makeQuestion({
        key: 'failure_recovery',
        type: 'single',
        sortOrder: 2,
        titleKey: 'quiz.questions.failure_recovery.title',
        descriptionKey: 'quiz.questions.failure_recovery.description',
        options: [
          {
            labelKey: 'quiz.questions.failure_recovery.options.stress_reactive',
            value: 'stress_reactive',
            weights: { emotional: 3, perfectionist: 2, anxious: 2 }
          },
          {
            labelKey: 'quiz.questions.failure_recovery.options.tunnel_fixer',
            value: 'tunnel_fixer',
            weights: { persistent: 3, analytical: 2, stubborn: 1, persistent_fighter: 3 }
          },
          {
            labelKey: 'quiz.questions.failure_recovery.options.growth_mindset',
            value: 'growth_mindset',
            weights: { resilient: 3, adaptive: 2, positive: 2, adaptive_learner: 3 }
          },
          {
            labelKey: 'quiz.questions.failure_recovery.options.collaborative_learner',
            value: 'collaborative_learner',
            weights: { social: 3, methodical: 2, humble: 2, collaborative_solver: 3 }
          },
          {
            labelKey: 'quiz.questions.failure_recovery.options.analytical_post_mortem',
            value: 'analytical_post_mortem',
            weights: { analytical: 3, systematic: 2, perfectionist: 1, strategic_thinker: 3 }
          }
        ]
      }),
      makeQuestion({
        key: 'learning_plateau',
        type: 'single',
        sortOrder: 3,
        titleKey: 'quiz.questions.learning_plateau.title',
        descriptionKey: 'quiz.questions.learning_plateau.description',
        options: [
          {
            labelKey: 'quiz.questions.learning_plateau.options.challenge_escalator',
            value: 'challenge_escalator',
            weights: { ambitious: 3, practical: 2, risk_taker: 2, persistent_fighter: 2 }
          },
          {
            labelKey: 'quiz.questions.learning_plateau.options.foundation_strengthener',
            value: 'foundation_strengthener',
            weights: { systematic: 3, methodical: 2, perfectionist: 2, strategic_thinker: 3 }
          },
          {
            labelKey: 'quiz.questions.learning_plateau.options.technology_explorer',
            value: 'technology_explorer',
            weights: { innovative: 3, adaptive: 2, curious: 3, adaptive_learner: 3 }
          },
          {
            labelKey: 'quiz.questions.learning_plateau.options.community_joiner',
            value: 'community_joiner',
            weights: { social: 3, collaborative: 2, humble: 2, collaborative_solver: 3 }
          },
          {
            labelKey: 'quiz.questions.learning_plateau.options.strategic_breaker',
            value: 'strategic_breaker',
            weights: { reflective: 3, balanced: 2, self_aware: 2, strategic_thinker: 2 }
          }
        ]
      })
    ]
  }
];

export const standaloneQuizQuestions: QuizQuestionContent[] = [];
