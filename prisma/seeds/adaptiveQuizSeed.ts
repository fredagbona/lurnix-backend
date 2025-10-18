import fs from 'fs';
import path from 'path';
import { QuizType, QuestionType, SkillDifficulty } from '@prisma/client';
import { db } from '../../src/prisma/prismaWrapper';
import { PROFILE_SKILL_DEFINITIONS, PROFILE_SKILL_IDS } from './data/profileSkillIds';

const PROFILE_QUIZ_ID = '6e8f6c3c-1345-4fb8-9e6c-3e8aae54f3a1';

const EN_PROFILE_TRANSLATION = {
  title: 'Brain Adaptive Onboarding',
  description: 'Tell us how you like to learn',
};

type QuestionTranslationResource = {
  prompt: string;
  options: Record<string, string>;
};

type QuizTranslationResource = {
  title: string;
  description: string;
  questions: Record<string, QuestionTranslationResource>;
};

const TRANSLATION_DATA_DIR = path.join(__dirname, 'data');

const loadTranslationResource = (fileName: string): QuizTranslationResource | null => {
  const resourcePath = path.join(TRANSLATION_DATA_DIR, fileName);

  if (!fs.existsSync(resourcePath)) {
    console.warn(`[adaptiveQuizSeed] Translation resource not found: ${resourcePath}`);
    return null;
  }

  try {
    const content = fs.readFileSync(resourcePath, 'utf-8');
    return JSON.parse(content) as QuizTranslationResource;
  } catch (error) {
    console.error(`[adaptiveQuizSeed] Failed to parse translation resource ${resourcePath}`, error);
    return null;
  }
};

type SeedQuestion = {
  id: string;
  prompt: string;
  sortOrder: number;
  type: QuestionType;
  options: Array<{ id: string; text: string }>;
  skillIds?: string[];
};

const ensureProfileSkills = async () => {
  for (const definition of PROFILE_SKILL_DEFINITIONS) {
    await db.skill.upsert({
      where: { id: definition.id },
      update: {
        name: definition.name,
        category: definition.category,
        description: definition.description,
        difficulty: definition.difficulty
      },
      create: {
        id: definition.id,
        name: definition.name,
        category: definition.category,
        description: definition.description,
        difficulty: definition.difficulty
      }
    });
  }
};

const profileQuizQuestions: SeedQuestion[] = [
  {
    id: '70c6a603-68d7-4c0e-9f0a-91f1492d5f82',
    prompt: 'When you explore a brand-new framework, what is your first move?',
    sortOrder: 1,
    type: QuestionType.multiple_choice,
    skillIds: [PROFILE_SKILL_IDS.learningPreferences],
    options: [
      { id: 'visual_first', text: 'Watch a high-level overview or UI walkthrough' },
      { id: 'documentation_first', text: 'Read the official documentation front to back' },
      { id: 'hands_on_first', text: 'Clone the repo and start tinkering' },
      { id: 'social_first', text: 'Ask teammates or community for best practices' }
    ]
  },
  {
    id: '26645b74-43c0-48bd-b7c3-780872e21e76',
    prompt: 'How do you usually debug a stubborn bug?',
    sortOrder: 2,
    type: QuestionType.multiple_choice,
    skillIds: [PROFILE_SKILL_IDS.debuggingStrategies],
    options: [
      { id: 'analytical_debug', text: 'Trace the code path systematically until it fails' },
      { id: 'experimental_debug', text: 'Try variations quickly until something sticks' },
      { id: 'community_debug', text: 'Discuss with others to gather different perspectives' },
      { id: 'reflective_debug', text: 'Step away, reflect, and return with a fresh mind' }
    ]
  },
  {
    id: 'ae73f4ec-49ac-498f-b6da-91c7c7648c89',
    prompt: 'What helps you retain new concepts the best?',
    sortOrder: 3,
    type: QuestionType.multiple_choice,
    skillIds: [PROFILE_SKILL_IDS.retentionTechniques],
    options: [
      { id: 'visual_memory', text: 'Diagrams, charts, and visual explanations' },
      { id: 'practical_memory', text: 'Building something or practicing hands-on' },
      { id: 'social_memory', text: 'Discussing or teaching others' },
      { id: 'analytical_memory', text: 'Working through written explanations and theory' }
    ]
  },
  {
    id: '8d8e7002-78a8-4058-9898-155e53092fa5',
    prompt: 'How do you prefer to kick off a new project?',
    sortOrder: 4,
    type: QuestionType.multiple_choice,
    skillIds: [PROFILE_SKILL_IDS.projectKickoff],
    options: [
      { id: 'ui_first', text: 'Sketch the interface or experience first' },
      { id: 'architecture_first', text: 'Design the system architecture and data flow' },
      { id: 'mvp_first', text: 'Ship the smallest thing that works and iterate' },
      { id: 'research_first', text: 'Research thoroughly before writing any code' }
    ]
  },
  {
    id: '1cc3af79-0949-4a0d-808f-092534ec4977',
    prompt: 'What is your long-term coding dream?',
    sortOrder: 5,
    type: QuestionType.multiple_choice,
    skillIds: [PROFILE_SKILL_IDS.careerVision],
    options: [
      { id: 'impact_global', text: 'Build something that creates global impact' },
      { id: 'freedom_lifestyle', text: 'Achieve location and schedule freedom' },
      { id: 'intellectual_challenge', text: 'Solve deep technical problems for fun' },
      { id: 'creative_expression', text: 'Express creativity through interactive products' },
      { id: 'team_growth', text: 'Grow, mentor, and lead high-performing teams' }
    ]
  },
  {
    id: '1a4b3b7f-3bbf-460a-af27-f94503b9e862',
    prompt: 'What derails your learning momentum fastest?',
    sortOrder: 6,
    type: QuestionType.multiple_choice,
    skillIds: [PROFILE_SKILL_IDS.learningBlockers],
    options: [
      { id: 'impatient_practical', text: 'Too much theory without building anything' },
      { id: 'need_theory', text: 'Diving in without understanding the “why”' },
      { id: 'need_examples', text: 'Lack of concrete examples to mirror' },
      { id: 'need_time', text: 'Not having enough focused, uninterrupted time' },
      { id: 'need_community', text: 'Feeling isolated without peers or mentors' }
    ]
  },
  {
    id: '2c0bd51c-4f61-4cff-9b64-5d5c4290f5fb',
    prompt: 'When do you feel most successful after a session?',
    sortOrder: 7,
    type: QuestionType.multiple_choice,
    skillIds: [PROFILE_SKILL_IDS.motivationSignals],
    options: [
      { id: 'clean_execution', text: 'Everything works flawlessly with polished code' },
      { id: 'completion_focus', text: 'I checked the task off my list' },
      { id: 'teaching_satisfaction', text: 'I could teach someone else what I learned' },
      { id: 'problem_solving_satisfaction', text: 'I cracked a challenging bug or concept' },
      { id: 'innovation_satisfaction', text: 'I created something uniquely clever' }
    ]
  },
  {
    id: 'd9dc6a5d-31ff-4c52-932b-9581f075c67b',
    prompt: 'How much focused time can you realistically invest each week?',
    sortOrder: 8,
    type: QuestionType.multiple_choice,
    skillIds: [PROFILE_SKILL_IDS.timeCommitment],
    options: [
      { id: 'intensive_time', text: '20+ hours – I can make it my primary focus' },
      { id: 'balanced_time', text: '10-20 hours – steady, sustainable progress' },
      { id: 'constrained_time', text: '5-10 hours – nights and weekends only' },
      { id: 'irregular_time', text: 'It fluctuates wildly week to week' }
    ]
  },
  {
    id: 'c50ce6b4-5f18-4f2c-9483-4799cf5cad5c',
    prompt: 'Which kind of demo day gets you the most excited?',
    sortOrder: 9,
    type: QuestionType.multiple_choice,
    skillIds: [PROFILE_SKILL_IDS.techPassions],
    options: [
      { id: 'ui_excitement', text: 'Slick UX/UI interactions and polish' },
      { id: 'ai_excitement', text: 'AI breakthroughs and intelligent assistants' },
      { id: 'data_excitement', text: 'Insightful dashboards and data stories' },
      { id: 'backend_excitement', text: 'Scalable, resilient backend systems' },
      { id: 'interactive_excitement', text: 'Interactive or gamified experiences' },
      { id: 'security_excitement', text: 'Security wins and threat mitigation' }
    ]
  },
  {
    id: '0ea343c5-42f0-4c80-a1bb-fc74493540e7',
    prompt: 'What would you love your first flagship project to be?',
    sortOrder: 10,
    type: QuestionType.multiple_choice,
    skillIds: [PROFILE_SKILL_IDS.projectAspirations],
    options: [
      { id: 'mobile_app_dream', text: 'A polished mobile app' },
      { id: 'website_cause_dream', text: 'A beautiful site for a cause I care about' },
      { id: 'automation_dream', text: 'An automation that saves people serious time' },
      { id: 'game_dream', text: 'An interactive game or experience' },
      { id: 'dashboard_dream', text: 'A data-rich dashboard for decision making' },
      { id: 'opensource_dream', text: 'An open-source library the community adopts' }
    ]
  },
  {
    id: 'c225c5e1-d2fa-4ccd-9f2e-5e09e1988ab4',
    prompt: 'Which description fits your tech personality best today?',
    sortOrder: 11,
    type: QuestionType.multiple_choice,
    skillIds: [PROFILE_SKILL_IDS.techPersona],
    options: [
      { id: 'designer_dev', text: 'Design-minded – aesthetics meet logic' },
      { id: 'problem_solver', text: 'Problem-solver – give me puzzles to crack' },
      { id: 'experimenter', text: 'Experimenter – I love prototyping and tinkering' },
      { id: 'team_builder', text: 'Team-builder – collaboration energises me' },
      { id: 'system_architect', text: 'System architect – I think in components and flows' }
    ]
  },
  {
    id: '833dfa78-4412-46ac-8f0a-6ec323f53920',
    prompt: 'When you get stuck, what is your default reaction?',
    sortOrder: 12,
    type: QuestionType.multiple_choice,
    skillIds: [PROFILE_SKILL_IDS.stuckResponse],
    options: [
      { id: 'knowledge_builder', text: 'Review fundamentals or learning materials again' },
      { id: 'experimenting_solver', text: 'Try alternative approaches quickly' },
      { id: 'social_connector', text: 'Reach out to mentors or peers for guidance' },
      { id: 'reflective_pauser', text: 'Pause, reflect, and plan a structured retry' }
    ]
  },
  {
    id: 'f72fdcae-310c-4acd-9f72-ba2f85e93ac7',
    prompt: 'What do you do when progress plateaus?',
    sortOrder: 13,
    type: QuestionType.multiple_choice,
    skillIds: [PROFILE_SKILL_IDS.growthMindset],
    options: [
      { id: 'foundation_strengthener', text: 'Rebuild foundations with targeted practice' },
      { id: 'new_challenge_seeker', text: 'Seek a harder challenge to break through' },
      { id: 'reflection_planner', text: 'Reflect, document, and adjust my plan' },
      { id: 'coaching_candidate', text: 'Look for coaching or feedback sessions' }
    ]
  },
  {
    id: '74a86960-3485-45c2-9cc2-fbff4ea002be',
    prompt: 'How do you prefer to structure focus sessions?',
    sortOrder: 14,
    type: QuestionType.multiple_choice,
    skillIds: [PROFILE_SKILL_IDS.focusHabits],
    options: [
      { id: 'micro_bursts', text: 'Short micro-bursts (Pomodoro style)' },
      { id: 'deep_blocks', text: 'Long deep work blocks' },
      { id: 'paired_sessions', text: 'Paired or co-working sessions' },
      { id: 'flexible_flows', text: 'Whatever fits the day – I switch it up' }
    ]
  },
  {
    id: 'c8e7936f-63b6-4ae9-9209-f1977570c5d1',
    prompt: 'How do you keep your planning on track?',
    sortOrder: 15,
    type: QuestionType.multiple_choice,
    skillIds: [PROFILE_SKILL_IDS.planningSystems],
    options: [
      { id: 'daily_checklist', text: 'Daily checklists keep me anchored' },
      { id: 'weekly_milestones', text: 'Weekly outcomes drive my focus' },
      { id: 'kanban_flow', text: 'Kanban or task boards guide my flow' },
      { id: 'retrospective_planning', text: 'I plan after reflecting on what worked' }
    ]
  },
  {
    id: '15f4a9bb-3f1f-4a4b-89a9-9b961c6e9bf0',
    prompt: 'How many hours can you learn per week?',
    sortOrder: 16,
    type: QuestionType.multiple_choice,
    skillIds: [PROFILE_SKILL_IDS.weeklyAvailability],
    options: [
      { id: 'under_5', text: 'Under 5 hours' },
      { id: '5_to_10', text: '5-10 hours' },
      { id: '10_to_15', text: '10-15 hours' },
      { id: 'over_15', text: '15+ hours' }
    ]
  },
  {
    id: '2b2b7087-a686-4b0e-8859-9bb83250c0b4',
    prompt: 'Which weekly rhythm sounds closest to yours?',
    sortOrder: 17,
    type: QuestionType.multiple_choice,
    skillIds: [PROFILE_SKILL_IDS.weeklyRhythm],
    options: [
      { id: 'structured_flow', text: 'Structured – I thrive with a steady routine' },
      { id: 'unpredictable_flow', text: 'Unpredictable – every week looks different' },
      { id: 'weekend_warrior', text: 'Weekend warrior – most progress happens then' },
      { id: 'surge_then_rest', text: 'Surge/rest – intense sprints followed by breaks' }
    ]
  },
  {
    id: '635758ae-84b8-4227-b336-5cd9744d01f9',
    prompt: 'When do you usually have peak energy?',
    sortOrder: 18,
    type: QuestionType.multiple_choice,
    skillIds: [PROFILE_SKILL_IDS.energyManagement],
    options: [
      { id: 'morning_sprinter', text: 'Early mornings – fresh start energy' },
      { id: 'afternoon_builder', text: 'Afternoons – after I warm up' },
      { id: 'evening_grinder', text: 'Evenings – I switch on after work' },
      { id: 'night_owl', text: 'Late nights – quiet focus hours' }
    ]
  },
  {
    id: '8099d9ce-2c2d-4adf-ae1f-b21af7d1f312',
    prompt: 'How do you handle context switching across tasks?',
    sortOrder: 19,
    type: QuestionType.multiple_choice,
    skillIds: [PROFILE_SKILL_IDS.contextSwitching],
    options: [
      { id: 'high_switch', text: 'I thrive on juggling multiple threads' },
      { id: 'moderate_switch', text: 'I can swap tasks a few times without stress' },
      { id: 'low_switch', text: 'I prefer to finish one thing before starting another' },
      { id: 'single_track', text: 'I need single-task focus or I get overwhelmed' }
    ]
  },
  {
    id: 'e9d97f5f-f4f4-4928-9e30-4ce8e6fd2182',
    prompt: 'What is your go-to note-taking method?',
    sortOrder: 20,
    type: QuestionType.multiple_choice,
    skillIds: [PROFILE_SKILL_IDS.noteTaking],
    options: [
      { id: 'long_form_journal', text: 'Long-form journaling or narrative notes' },
      { id: 'structured_docs', text: 'Structured docs with headings and templates' },
      { id: 'bullet_snippets', text: 'Bullet lists and quick snippets' },
      { id: 'visual_whiteboards', text: 'Visual canvases, mind-maps, or whiteboards' }
    ]
  },
  {
    id: 'c8680703-1599-4a30-8f48-d6d76012bb20',
    prompt: 'How do you bounce back after a setback?',
    sortOrder: 21,
    type: QuestionType.multiple_choice,
    skillIds: [PROFILE_SKILL_IDS.resilience],
    options: [
      { id: 'analytical_post_mortem', text: 'Run a post-mortem to extract lessons' },
      { id: 'quick_reset', text: 'Shake it off and restart immediately' },
      { id: 'mentor_sync', text: 'Talk it through with a mentor or friend' },
      { id: 'rest_recover', text: 'Rest intentionally before returning' }
    ]
  },
  {
    id: '2b4d812b-61a1-4074-8dfe-37f3351c66a0',
    prompt: 'What keeps you accountable to your goals?',
    sortOrder: 22,
    type: QuestionType.multiple_choice,
    skillIds: [PROFILE_SKILL_IDS.accountability],
    options: [
      { id: 'public_share', text: 'Sharing progress publicly keeps me honest' },
      { id: 'mentor_checkins', text: 'Regular mentor or coach check-ins' },
      { id: 'peer_standups', text: 'Small peer stand-ups or accountability pods' },
      { id: 'private_metrics', text: 'Private metrics and habit trackers' }
    ]
  },
  {
    id: '4c3de70a-6b8f-4f06-9563-9ecf794fa994',
    prompt: 'Which support channels do you see yourself using the most?',
    sortOrder: 23,
    type: QuestionType.multiple_select,
    skillIds: [PROFILE_SKILL_IDS.supportPreferences],
    options: [
      { id: 'mentorship', text: '1:1 mentorship or coaching' },
      { id: 'study_buddy', text: 'Study buddy or pairing partner' },
      { id: 'asynchronous_forum', text: 'Async forum or community threads' },
      { id: 'office_hours', text: 'Scheduled office hours or group calls' },
      { id: 'self_reliant', text: 'Mostly self-reliant with minimal support' }
    ]
  },
  {
    id: '4fd14e66-f5d0-4c1f-a7f7-9d2519749031',
    prompt: 'What is your ideal planning cadence for sprints?',
    sortOrder: 24,
    type: QuestionType.multiple_choice,
    skillIds: [PROFILE_SKILL_IDS.sprintPlanningCadence],
    options: [
      { id: 'daily_sync', text: 'Daily syncs and adjustments' },
      { id: 'twice_weekly', text: 'Twice-weekly planning check-ins' },
      { id: 'weekly_planning', text: 'Weekly sprint planning is enough' },
      { id: 'async_updates', text: 'Async updates with occasional deep reviews' }
    ]
  }
];

export async function seedAdaptiveQuizzes() {
  console.log('🧠 Seeding adaptive knowledge quizzes...');

  await ensureProfileSkills();

  await db.quizAnswer.deleteMany({});
  await db.quizAttempt.deleteMany({});
  await db.knowledgeQuizQuestion.deleteMany({});
  await db.knowledgeQuiz.deleteMany({});

  const frProfileTranslation = loadTranslationResource('profileQuizTranslations.fr.json');

  await db.knowledgeQuiz.upsert({
    where: { id: PROFILE_QUIZ_ID },
    update: {
      title: 'Brain Adaptive Onboarding',
      description: 'Tell us how you like to learn',
      type: QuizType.pre_sprint,
      passingScore: 0,
      timeLimit: null,
      attemptsAllowed: 1,
      blocksProgression: false,
      isRequired: true,
      skillIds: [],
      sprintId: null,
      objectiveId: null
    },
    create: {
      id: PROFILE_QUIZ_ID,
      title: 'Brain Adaptive Onboarding',
      description: 'Tell us how you like to learn',
      type: QuizType.pre_sprint,
      passingScore: 0,
      timeLimit: null,
      attemptsAllowed: 1,
      blocksProgression: false,
      isRequired: true,
      skillIds: [],
      sprintId: null,
      objectiveId: null
    }
  });

  await db.knowledgeQuizQuestion.createMany({
    data: profileQuizQuestions.map((question) => ({
      id: question.id,
      quizId: PROFILE_QUIZ_ID,
      type: question.type,
      question: question.prompt,
      options: question.options.map((option) => ({ ...option, isCorrect: false })),
      difficulty: SkillDifficulty.beginner,
      skillIds: question.skillIds ?? [],
      points: 1,
      sortOrder: question.sortOrder
    }))
  });

  await db.knowledgeQuizTranslation.createMany({
    data: [
      {
        quizId: PROFILE_QUIZ_ID,
        language: 'en',
        title: EN_PROFILE_TRANSLATION.title,
        description: EN_PROFILE_TRANSLATION.description,
      },
      ...(frProfileTranslation
        ? [{
            quizId: PROFILE_QUIZ_ID,
            language: 'fr',
            title: frProfileTranslation.title,
            description: frProfileTranslation.description,
          }]
        : []),
    ],
    skipDuplicates: true,
  });

  const questionTranslationData: Array<{
    questionId: string;
    language: string;
    question: string;
    options: any;
  }> = [];

  for (const question of profileQuizQuestions) {
    questionTranslationData.push({
      questionId: question.id,
      language: 'en',
      question: question.prompt,
      options: question.options.map((option) => ({ id: option.id, text: option.text })),
    });

    if (frProfileTranslation?.questions?.[question.id]) {
      const frQuestion = frProfileTranslation.questions[question.id];
      const frOptions = Object.entries(frQuestion.options || {}).map(([optionId, text]) => ({
        id: optionId,
        text,
      }));

      questionTranslationData.push({
        questionId: question.id,
        language: 'fr',
        question: frQuestion.prompt,
        options: frOptions,
      });
    }
  }

  if (questionTranslationData.length > 0) {
    await db.knowledgeQuizQuestionTranslation.createMany({
      data: questionTranslationData,
      skipDuplicates: true,
    });
  }

  console.log('✅ Adaptive quizzes seeded successfully.');
}

if (require.main === module) {
  seedAdaptiveQuizzes()
    .then(() => {
      console.log('🌱 Adaptive quiz seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Adaptive quiz seeding failed:', error);
      process.exit(1);
    });
}
