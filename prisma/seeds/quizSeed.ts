import { PrismaClient } from '@prisma/client';
import { db } from '../../src/prisma/prismaWrapper';

// Use the db instance from the wrapper instead of creating a new client
// This ensures we're using the same client with the correct schema

async function seedQuizData() {
  console.log('🧠 Seeding quiz data...');
  
  try {

  // Define quiz version
  const quizVersion = 1;

  // Create sections based on quizz.md
  const sections = [
    {
      title: 'Cognitive & Learning Styles',
      description: 'These questions help us understand how you learn best.',
      sortOrder: 1,
      version: quizVersion,
      isActive: true
    },
    {
      title: 'Motivations & Objectives',
      description: 'These questions identify your goals and priorities.',
      sortOrder: 2,
      version: quizVersion,
      isActive: true
    },
    {
      title: 'Passions & Domain Interests',
      description: 'These help us align your roadmap with your interests.',
      sortOrder: 3,
      version: quizVersion,
      isActive: true
    },
    {
      title: 'Cognitive Habits & Problem-Solving',
      description: 'These uncover your habits, persistence, and collaboration style.',
      sortOrder: 4,
      version: quizVersion,
      isActive: true
    }
  ];

  // Delete existing sections and questions first to avoid duplicates
  await db.quizOption.deleteMany({});
  await db.quizQuestion.deleteMany({});
  await db.quizSection.deleteMany({});
  
  // Create sections in database
  const createdSections = [];
  for (const section of sections) {
    // Create new section
    const createdSection = await db.quizSection.create({
      data: section
    });
    
    createdSections.push(createdSection);
    console.log(`Created section: ${createdSection.title}`);
  }

  // Define questions for Section 1: Cognitive & Learning Styles
  const section1Questions = [
    {
      key: 'learning_instinct',
      title: 'When learning something new, what\'s your first instinct?',
      description: '',
      type: 'single',
      weightCategory: 'learning_style',
      sortOrder: 1,
      version: quizVersion,
      isActive: true,
      sectionId: createdSections[0].id,
      options: [
        {
          label: 'Watch a video or demo',
          value: 'visual',
          weights: { visual: 3, reading: 1, handsOn: 1 }
        },
        {
          label: 'Read documentation or articles',
          value: 'reading',
          weights: { visual: 1, reading: 3, handsOn: 1 }
        },
        {
          label: 'Jump straight into coding',
          value: 'hands_on',
          weights: { visual: 1, reading: 1, handsOn: 3 }
        },
        {
          label: 'Listen to an explanation/discussion',
          value: 'auditory',
          weights: { visual: 1, reading: 2, handsOn: 1 }
        }
      ]
    },
    {
      key: 'remember_concepts',
      title: 'What helps you remember concepts better?',
      description: '',
      type: 'single',
      weightCategory: 'memory_style',
      sortOrder: 2,
      version: quizVersion,
      isActive: true,
      sectionId: createdSections[0].id,
      options: [
        {
          label: 'Diagrams and visuals',
          value: 'visual',
          weights: { visual: 3, reading: 1, handsOn: 1 }
        },
        {
          label: 'Written notes',
          value: 'reading',
          weights: { visual: 1, reading: 3, handsOn: 1 }
        },
        {
          label: 'Practicing by building',
          value: 'hands_on',
          weights: { visual: 1, reading: 1, handsOn: 3 }
        },
        {
          label: 'Talking through with others',
          value: 'social',
          weights: { visual: 1, reading: 1, handsOn: 2 }
        }
      ]
    },
    {
      key: 'complex_problem',
      title: 'If given a complex problem...',
      description: '',
      type: 'single',
      weightCategory: 'problem_solving',
      sortOrder: 3,
      version: quizVersion,
      isActive: true,
      sectionId: createdSections[0].id,
      options: [
        {
          label: 'I break it into smaller sequential steps',
          value: 'sequential',
          weights: { sequential: 3, global: 1 }
        },
        {
          label: 'I try to see the big picture first',
          value: 'global',
          weights: { sequential: 1, global: 3 }
        }
      ]
    },
    {
      key: 'code_samples',
      title: 'When reviewing code samples, do you prefer...',
      description: '',
      type: 'single',
      weightCategory: 'code_review',
      sortOrder: 4,
      version: quizVersion,
      isActive: true,
      sectionId: createdSections[0].id,
      options: [
        {
          label: 'Annotated diagrams or flowcharts',
          value: 'visual',
          weights: { visual: 3, reading: 1, handsOn: 1 }
        },
        {
          label: 'Inline comments and text explanations',
          value: 'reading',
          weights: { visual: 1, reading: 3, handsOn: 1 }
        },
        {
          label: 'Running the code and experimenting',
          value: 'hands_on',
          weights: { visual: 1, reading: 1, handsOn: 3 }
        }
      ]
    },
    {
      key: 'lecture_preference',
      title: 'In a lecture setting, do you prefer...',
      description: '',
      type: 'single',
      weightCategory: 'lecture_style',
      sortOrder: 5,
      version: quizVersion,
      isActive: true,
      sectionId: createdSections[0].id,
      options: [
        {
          label: 'Listening actively and discussing',
          value: 'active',
          weights: { active: 3, reflective: 1 }
        },
        {
          label: 'Quietly reflecting and taking notes',
          value: 'reflective',
          weights: { active: 1, reflective: 3 }
        }
      ]
    },
    {
      key: 'debugging_approach',
      title: 'When debugging, what\'s your approach?',
      description: '',
      type: 'single',
      weightCategory: 'debugging',
      sortOrder: 6,
      version: quizVersion,
      isActive: true,
      sectionId: createdSections[0].id,
      options: [
        {
          label: 'Experiment with small changes',
          value: 'experimental',
          weights: { handsOn: 3, reading: 1 }
        },
        {
          label: 'Carefully read through docs/stack traces',
          value: 'analytical',
          weights: { reading: 3, handsOn: 1 }
        },
        {
          label: 'Ask someone or search community forums',
          value: 'social',
          weights: { social: 3, reading: 2 }
        }
      ]
    },
    {
      key: 'learning_sequence',
      title: 'Do you learn better...',
      description: '',
      type: 'single',
      weightCategory: 'learning_sequence',
      sortOrder: 7,
      version: quizVersion,
      isActive: true,
      sectionId: createdSections[0].id,
      options: [
        {
          label: 'Step by step (sequential)',
          value: 'sequential',
          weights: { sequential: 3, global: 1 }
        },
        {
          label: 'By connecting concepts globally, even if order is less clear',
          value: 'global',
          weights: { sequential: 1, global: 3 }
        }
      ]
    }
  ];

  // Define questions for Section 2: Motivations & Objectives
  const section2Questions = [
    {
      key: 'learning_reason',
      title: 'Why are you learning to code?',
      description: 'Choose one',
      type: 'single',
      weightCategory: 'motivation',
      sortOrder: 1,
      version: quizVersion,
      isActive: true,
      sectionId: createdSections[1].id,
      options: [
        {
          label: 'To get a job as a developer',
          value: 'job',
          weights: { career: 3, hobby: 1 }
        },
        {
          label: 'To switch careers',
          value: 'career_switch',
          weights: { career: 3, hobby: 1 }
        },
        {
          label: 'To build my own startup/product',
          value: 'startup',
          weights: { career: 2, hobby: 2 }
        },
        {
          label: 'As a hobby/personal growth',
          value: 'hobby',
          weights: { career: 1, hobby: 3 }
        },
        {
          label: 'To automate tasks at work',
          value: 'automation',
          weights: { career: 2, hobby: 2 }
        }
      ]
    },
    {
      key: 'important_outcome',
      title: 'What outcome is most important to you?',
      description: '',
      type: 'single',
      weightCategory: 'outcome',
      sortOrder: 2,
      version: quizVersion,
      isActive: true,
      sectionId: createdSections[1].id,
      options: [
        {
          label: 'Building a portfolio',
          value: 'portfolio',
          weights: { career: 3, project: 3 }
        },
        {
          label: 'Passing interviews/certifications',
          value: 'certification',
          weights: { career: 3, fundamentals: 2 }
        },
        {
          label: 'Launching a project',
          value: 'project',
          weights: { project: 3, career: 1 }
        },
        {
          label: 'Gaining confidence and understanding fundamentals',
          value: 'fundamentals',
          weights: { fundamentals: 3, career: 1 }
        }
      ]
    },
    {
      key: 'priorities',
      title: 'Rank these from most to least important:',
      description: '',
      type: 'rank',
      weightCategory: 'priorities',
      sortOrder: 3,
      version: quizVersion,
      isActive: true,
      sectionId: createdSections[1].id,
      options: [
        {
          label: 'Job-readiness',
          value: 'job_readiness',
          weights: { career: 3 }
        },
        {
          label: 'Building projects',
          value: 'projects',
          weights: { project: 3 }
        },
        {
          label: 'Certifications',
          value: 'certifications',
          weights: { career: 2 }
        },
        {
          label: 'Enjoying the process',
          value: 'enjoyment',
          weights: { hobby: 3 }
        }
      ]
    },
    {
      key: 'timeline',
      title: 'How soon do you hope to see results?',
      description: '',
      type: 'single',
      weightCategory: 'timeline',
      sortOrder: 4,
      version: quizVersion,
      isActive: true,
      sectionId: createdSections[1].id,
      options: [
        {
          label: 'Within weeks',
          value: 'weeks',
          weights: { intensity: 3 }
        },
        {
          label: 'Within months',
          value: 'months',
          weights: { intensity: 2 }
        },
        {
          label: 'No deadline, I\'m exploring',
          value: 'no_deadline',
          weights: { intensity: 1 }
        }
      ]
    },
    {
      key: 'learning_depth',
      title: 'Do you prefer learning...',
      description: '',
      type: 'single',
      weightCategory: 'depth',
      sortOrder: 5,
      version: quizVersion,
      isActive: true,
      sectionId: createdSections[1].id,
      options: [
        {
          label: 'To specialize in one stack deeply',
          value: 'deep',
          weights: { depth: 3, breadth: 1 }
        },
        {
          label: 'To explore multiple technologies broadly',
          value: 'broad',
          weights: { depth: 1, breadth: 3 }
        }
      ]
    }
  ];

  // Define questions for Section 3: Passions & Domain Interests
  const section3Questions = [
    {
      key: 'tech_areas',
      title: 'Which tech areas excite you most?',
      description: 'Rank top 3',
      type: 'multi',
      weightCategory: 'interests',
      sortOrder: 1,
      version: quizVersion,
      isActive: true,
      sectionId: createdSections[2].id,
      options: [
        {
          label: 'Web development',
          value: 'web',
          weights: { web: 3 }
        },
        {
          label: 'Mobile apps',
          value: 'mobile',
          weights: { mobile: 3 }
        },
        {
          label: 'Data science',
          value: 'data',
          weights: { data: 3 }
        },
        {
          label: 'AI/ML',
          value: 'ai',
          weights: { ai: 3 }
        },
        {
          label: 'Cybersecurity',
          value: 'security',
          weights: { security: 3 }
        },
        {
          label: 'Game development',
          value: 'game',
          weights: { game: 3 }
        },
        {
          label: 'DevOps / Cloud',
          value: 'devops',
          weights: { devops: 3 }
        }
      ]
    },
    {
      key: 'project_motivation',
      title: 'What kind of projects feel most motivating?',
      description: '',
      type: 'single',
      weightCategory: 'project_type',
      sortOrder: 2,
      version: quizVersion,
      isActive: true,
      sectionId: createdSections[2].id,
      options: [
        {
          label: 'Visual (UI, apps, websites)',
          value: 'visual',
          weights: { web: 3, mobile: 2 }
        },
        {
          label: 'Analytical (data, models, insights)',
          value: 'analytical',
          weights: { data: 3, ai: 2 }
        },
        {
          label: 'Creative (games, interactive media)',
          value: 'creative',
          weights: { game: 3, web: 1 }
        },
        {
          label: 'Practical (automation, tools, scripts)',
          value: 'practical',
          weights: { devops: 2, data: 1 }
        }
      ]
    },
    {
      key: 'self_description',
      title: 'Which description fits you best?',
      description: '',
      type: 'single',
      weightCategory: 'personality',
      sortOrder: 3,
      version: quizVersion,
      isActive: true,
      sectionId: createdSections[2].id,
      options: [
        {
          label: 'Builder — I want to create usable things quickly',
          value: 'builder',
          weights: { handsOn: 3, reading: 1 }
        },
        {
          label: 'Explorer — I like experimenting across topics',
          value: 'explorer',
          weights: { breadth: 3, depth: 1 }
        },
        {
          label: 'Problem-solver — I enjoy puzzles and debugging',
          value: 'problem_solver',
          weights: { analytical: 3, creative: 1 }
        },
        {
          label: 'Visionary — I want to connect coding to big goals',
          value: 'visionary',
          weights: { global: 3, sequential: 1 }
        }
      ]
    },
    {
      key: 'preferred_stack',
      title: 'If you had to choose one stack today, what would it be?',
      description: '',
      type: 'single',
      weightCategory: 'stack',
      sortOrder: 4,
      version: quizVersion,
      isActive: true,
      sectionId: createdSections[2].id,
      options: [
        {
          label: 'JavaScript + React (frontend)',
          value: 'frontend',
          weights: { web: 3, mobile: 1 }
        },
        {
          label: 'Node.js (backend)',
          value: 'backend',
          weights: { web: 2, devops: 2 }
        },
        {
          label: 'Python (data/automation/AI)',
          value: 'python',
          weights: { data: 2, ai: 2 }
        },
        {
          label: 'Not sure yet',
          value: 'undecided',
          weights: { breadth: 3 }
        }
      ]
    },
    {
      key: 'specific_stack',
      title: 'Specify your stack here (one)',
      description: '',
      type: 'single',
      weightCategory: 'specific_stack',
      sortOrder: 5,
      version: quizVersion,
      isActive: true,
      sectionId: createdSections[2].id,
      options: [
        {
          label: 'Custom input field',
          value: 'custom',
          weights: {}
        }
      ]
    },
    {
      key: 'job_title',
      title: 'What is your current job title?',
      description: '',
      type: 'single',
      weightCategory: 'experience',
      sortOrder: 6,
      version: quizVersion,
      isActive: true,
      sectionId: createdSections[2].id,
      options: [
        {
          label: 'Student',
          value: 'student',
          weights: { experience: 1 }
        },
        {
          label: 'Entry-level developer',
          value: 'entry',
          weights: { experience: 2 }
        },
        {
          label: 'Mid-level developer',
          value: 'mid',
          weights: { experience: 3 }
        },
        {
          label: 'Senior developer',
          value: 'senior',
          weights: { experience: 4 }
        },
        {
          label: 'Manager/Architect',
          value: 'manager',
          weights: { experience: 5 }
        },
        {
          label: 'Other',
          value: 'other',
          weights: { experience: 1 }
        }
      ]
    },
    {
      key: 'learning_goal',
      title: 'Specify your learning goal here (one)',
      description: '',
      type: 'single',
      weightCategory: 'goal',
      sortOrder: 7,
      version: quizVersion,
      isActive: true,
      sectionId: createdSections[2].id,
      options: [
        {
          label: 'Custom input field',
          value: 'custom',
          weights: {}
        }
      ]
    }
  ];

  // Define questions for Section 4: Cognitive Habits & Problem-Solving
  const section4Questions = [
    {
      key: 'bug_first_action',
      title: 'When you hit a bug, what do you do first?',
      description: '',
      type: 'single',
      weightCategory: 'debugging_style',
      sortOrder: 1,
      version: quizVersion,
      isActive: true,
      sectionId: createdSections[3].id,
      options: [
        {
          label: 'Try different experiments',
          value: 'experiment',
          weights: { handsOn: 3, reading: 1 }
        },
        {
          label: 'Research docs/Google',
          value: 'research',
          weights: { reading: 3, handsOn: 1 }
        },
        {
          label: 'Ask for help',
          value: 'ask',
          weights: { social: 3, independent: 1 }
        },
        {
          label: 'Take a break, then return',
          value: 'break',
          weights: { reflective: 3, active: 1 }
        }
      ]
    },
    {
      key: 'challenge_approach',
      title: 'How do you usually approach challenges?',
      description: '',
      type: 'single',
      weightCategory: 'problem_approach',
      sortOrder: 2,
      version: quizVersion,
      isActive: true,
      sectionId: createdSections[3].id,
      options: [
        {
          label: 'Alone, step by step',
          value: 'alone_sequential',
          weights: { independent: 3, sequential: 3 }
        },
        {
          label: 'Brainstorming with others',
          value: 'brainstorm',
          weights: { social: 3, global: 2 }
        },
        {
          label: 'Trial-and-error until it works',
          value: 'trial_error',
          weights: { handsOn: 3, persistence: 2 }
        },
        {
          label: 'Researching existing solutions first',
          value: 'research_first',
          weights: { reading: 3, analytical: 2 }
        }
      ]
    },
    {
      key: 'project_preference',
      title: 'When working on projects, do you…',
      description: '',
      type: 'single',
      weightCategory: 'project_style',
      sortOrder: 3,
      version: quizVersion,
      isActive: true,
      sectionId: createdSections[3].id,
      options: [
        {
          label: 'Prefer to follow a clear checklist',
          value: 'checklist',
          weights: { sequential: 3, global: 1 }
        },
        {
          label: 'Prefer open-ended exploration',
          value: 'exploration',
          weights: { global: 3, sequential: 1 }
        }
      ]
    },
    {
      key: 'community_engagement',
      title: 'How often do you discuss coding with peers or communities?',
      description: '',
      type: 'single',
      weightCategory: 'social_learning',
      sortOrder: 4,
      version: quizVersion,
      isActive: true,
      sectionId: createdSections[3].id,
      options: [
        {
          label: 'Rarely/Never',
          value: 'rarely',
          weights: { independent: 3, social: 1 }
        },
        {
          label: 'Sometimes',
          value: 'sometimes',
          weights: { independent: 2, social: 2 }
        },
        {
          label: 'Often',
          value: 'often',
          weights: { independent: 1, social: 2 }
        },
        {
          label: 'Almost always',
          value: 'always',
          weights: { independent: 1, social: 3 }
        }
      ]
    }
  ];

  // Combine all questions
  const allQuestions = [
    ...section1Questions,
    ...section2Questions,
    ...section3Questions,
    ...section4Questions
  ];

  // Create questions in database
  for (const question of allQuestions) {
    const { options, ...questionData } = question;
    
    // Create the question
    const createdQuestion = await db.quizQuestion.create({
      data: questionData
    });
    
    // Create options for this question
    for (const option of options) {
      await db.quizOption.create({
        data: {
          questionId: createdQuestion.id,
          label: option.label,
          value: option.value,
          weights: option.weights
        }
      });
    }
    
    console.log(`Created question: ${createdQuestion.title}`);
  }

  console.log('✅ Quiz data seeded successfully!');
  } catch (error) {
    console.error('❌ Error seeding quiz data:', error);
    throw error;
  }
}

export { seedQuizData };
