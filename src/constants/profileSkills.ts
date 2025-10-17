import { SkillDifficulty } from '@prisma/client';

export const PROFILE_SKILL_IDS = {
  learningPreferences: 'skill-learning-preferences',
  debuggingStrategies: 'skill-debugging-strategies',
  retentionTechniques: 'skill-retention-techniques',
  projectKickoff: 'skill-project-kickoff',
  careerVision: 'skill-career-vision',
  learningBlockers: 'skill-learning-blockers',
  motivationSignals: 'skill-motivation-signals',
  timeCommitment: 'skill-time-commitment',
  techPassions: 'skill-tech-passions',
  projectAspirations: 'skill-project-aspirations',
  techPersona: 'skill-tech-persona',
  stuckResponse: 'skill-stuck-response',
  growthMindset: 'skill-growth-mindset',
  focusHabits: 'skill-focus-habits',
  planningSystems: 'skill-planning-systems',
  weeklyAvailability: 'skill-weekly-availability',
  weeklyRhythm: 'skill-weekly-rhythm',
  energyManagement: 'skill-energy-management',
  contextSwitching: 'skill-context-switching',
  noteTaking: 'skill-note-taking',
  resilience: 'skill-resilience',
  accountability: 'skill-accountability',
  supportPreferences: 'skill-support-preferences',
  sprintPlanningCadence: 'skill-sprint-planning-cadence'
} as const;

export type ProfileSkillId = typeof PROFILE_SKILL_IDS[keyof typeof PROFILE_SKILL_IDS];

export type ProfileSkillDefinition = {
  id: ProfileSkillId;
  name: string;
  category: string;
  description: string;
  difficulty: SkillDifficulty;
};

export const PROFILE_SKILL_DEFINITIONS: ProfileSkillDefinition[] = [
  {
    id: PROFILE_SKILL_IDS.learningPreferences,
    name: 'Learning Preferences',
    category: 'profile_learning',
    description: 'Preferred approach when exploring new frameworks or tools.',
    difficulty: SkillDifficulty.beginner
  },
  {
    id: PROFILE_SKILL_IDS.debuggingStrategies,
    name: 'Debugging Strategies',
    category: 'profile_workflow',
    description: 'Default tactics for diagnosing and resolving issues.',
    difficulty: SkillDifficulty.beginner
  },
  {
    id: PROFILE_SKILL_IDS.retentionTechniques,
    name: 'Retention Techniques',
    category: 'profile_learning',
    description: 'Methods that help the learner retain new concepts.',
    difficulty: SkillDifficulty.beginner
  },
  {
    id: PROFILE_SKILL_IDS.projectKickoff,
    name: 'Project Kickoff Style',
    category: 'profile_workflow',
    description: 'How a learner approaches starting new projects.',
    difficulty: SkillDifficulty.beginner
  },
  {
    id: PROFILE_SKILL_IDS.careerVision,
    name: 'Career Vision',
    category: 'profile_motivation',
    description: 'Long-term goals and aspirations in tech.',
    difficulty: SkillDifficulty.beginner
  },
  {
    id: PROFILE_SKILL_IDS.learningBlockers,
    name: 'Learning Blockers',
    category: 'profile_support',
    description: 'Obstacles that derail learning momentum.',
    difficulty: SkillDifficulty.beginner
  },
  {
    id: PROFILE_SKILL_IDS.motivationSignals,
    name: 'Motivation Signals',
    category: 'profile_motivation',
    description: 'Signals that indicate a productive learning session.',
    difficulty: SkillDifficulty.beginner
  },
  {
    id: PROFILE_SKILL_IDS.timeCommitment,
    name: 'Time Commitment',
    category: 'profile_availability',
    description: 'Weekly hours the learner can dedicate to practice.',
    difficulty: SkillDifficulty.beginner
  },
  {
    id: PROFILE_SKILL_IDS.techPassions,
    name: 'Tech Passions',
    category: 'profile_passions',
    description: 'Technology areas that excite the learner most.',
    difficulty: SkillDifficulty.beginner
  },
  {
    id: PROFILE_SKILL_IDS.projectAspirations,
    name: 'Project Aspirations',
    category: 'profile_passions',
    description: 'Flagship project ideas the learner would love to build.',
    difficulty: SkillDifficulty.beginner
  },
  {
    id: PROFILE_SKILL_IDS.techPersona,
    name: 'Tech Persona',
    category: 'profile_identity',
    description: 'How the learner identifies within technical teams.',
    difficulty: SkillDifficulty.beginner
  },
  {
    id: PROFILE_SKILL_IDS.stuckResponse,
    name: 'Stuck Response Strategy',
    category: 'profile_workflow',
    description: 'Default action taken when encountering blockers.',
    difficulty: SkillDifficulty.beginner
  },
  {
    id: PROFILE_SKILL_IDS.growthMindset,
    name: 'Growth Strategy',
    category: 'profile_mindset',
    description: 'Approach to regaining momentum when progress stalls.',
    difficulty: SkillDifficulty.beginner
  },
  {
    id: PROFILE_SKILL_IDS.focusHabits,
    name: 'Focus Habits',
    category: 'profile_workflow',
    description: 'Preferred cadence for deep work and focus time.',
    difficulty: SkillDifficulty.beginner
  },
  {
    id: PROFILE_SKILL_IDS.planningSystems,
    name: 'Planning Systems',
    category: 'profile_workflow',
    description: 'Systems the learner uses to stay organised.',
    difficulty: SkillDifficulty.beginner
  },
  {
    id: PROFILE_SKILL_IDS.weeklyAvailability,
    name: 'Weekly Availability',
    category: 'profile_availability',
    description: 'General availability for structured learning time.',
    difficulty: SkillDifficulty.beginner
  },
  {
    id: PROFILE_SKILL_IDS.weeklyRhythm,
    name: 'Weekly Rhythm',
    category: 'profile_availability',
    description: 'Typical weekly rhythm for balancing commitments.',
    difficulty: SkillDifficulty.beginner
  },
  {
    id: PROFILE_SKILL_IDS.energyManagement,
    name: 'Energy Management',
    category: 'profile_availability',
    description: 'Times of day when the learner feels most energised.',
    difficulty: SkillDifficulty.beginner
  },
  {
    id: PROFILE_SKILL_IDS.contextSwitching,
    name: 'Context Switching Preference',
    category: 'profile_workflow',
    description: 'Comfort level with juggling multiple workstreams.',
    difficulty: SkillDifficulty.beginner
  },
  {
    id: PROFILE_SKILL_IDS.noteTaking,
    name: 'Note-taking Style',
    category: 'profile_learning',
    description: 'Preferred style for capturing notes and insights.',
    difficulty: SkillDifficulty.beginner
  },
  {
    id: PROFILE_SKILL_IDS.resilience,
    name: 'Resilience Strategy',
    category: 'profile_mindset',
    description: 'How the learner bounces back after setbacks.',
    difficulty: SkillDifficulty.beginner
  },
  {
    id: PROFILE_SKILL_IDS.accountability,
    name: 'Accountability Drivers',
    category: 'profile_support',
    description: 'Systems that keep the learner accountable to goals.',
    difficulty: SkillDifficulty.beginner
  },
  {
    id: PROFILE_SKILL_IDS.supportPreferences,
    name: 'Support Preferences',
    category: 'profile_support',
    description: 'Preferred support channels for collaboration and help.',
    difficulty: SkillDifficulty.beginner
  },
  {
    id: PROFILE_SKILL_IDS.sprintPlanningCadence,
    name: 'Sprint Planning Cadence',
    category: 'profile_workflow',
    description: 'Preferred cadence for planning and reflecting on sprints.',
    difficulty: SkillDifficulty.beginner
  }
];
