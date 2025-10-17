export const TECHNICAL_ASSESSMENT_VERSION = 1;

export type TechnicalAssessmentOption = {
  value: string;
  label: string;
};

export type TechnicalAssessmentQuestion =
  | {
      id: 'codingExperience' | 'projectExperience';
      type: 'single' | 'scale';
      prompt: string;
      description?: string;
      options: Array<{
        value: string | number;
        label: string;
        helperText?: string;
      }>;
    }
  | {
      id: 'toolExperience' | 'programmingConcepts';
      type: 'multi-select';
      prompt: string;
      description?: string;
      options: TechnicalAssessmentOption[];
      minimumSelection?: number;
    }
  | {
      id: 'environmentCheck';
      type: 'checklist';
      prompt: string;
      description?: string;
      items: Array<{
        id: string;
        label: string;
        helperText?: string;
      }>;
    };

export const technicalAssessmentQuestions: TechnicalAssessmentQuestion[] = [
  {
    id: 'codingExperience',
    type: 'single',
    prompt: 'Have you written code before?',
    options: [
      {
        value: 'absolute_beginner',
        label: 'Never,  I\'m a complete beginner',
        helperText: 'No prior coding experience or tooling familiarity.'
      },
      {
        value: 'beginner',
        label: 'A little, I followed tutorials',
        helperText: 'Some online tutorials or bootcamp exposure.'
      },
      {
        value: 'intermediate',
        label: 'Yes, I have solid foundation',
        helperText: 'Comfortable with core language concepts and tooling.'
      },
      {
        value: 'advanced',
        label: 'Yes, I code regularly',
        helperText: 'Professional or equivalent hands-on experience.'
      }
    ]
  },
  {
    id: 'toolExperience',
    type: 'multi-select',
    prompt: 'Which development tools are you familiar with?',
    description: 'Select every tool you feel confident using on your own.',
    options: [
      { value: 'terminal', label: 'Terminal / command line' },
      { value: 'git', label: 'Git / GitHub' },
      { value: 'package_manager', label: 'Package managers (npm, pip, etc.)' },
      { value: 'devtools', label: 'Browser developer tools' },
      { value: 'none', label: 'None of these' }
    ]
  },
  {
    id: 'programmingConcepts',
    type: 'multi-select',
    prompt: 'Which programming concepts do you understand?',
    description: 'Pick the concepts you can confidently explain to someone else.',
    options: [
      { value: 'variables', label: 'Variables and data types' },
      { value: 'functions', label: 'Functions and methods' },
      { value: 'control_flow', label: 'Loops and conditionals' },
      { value: 'objects', label: 'Objects and classes' },
      { value: 'apis', label: 'APIs and HTTP requests' },
      { value: 'none', label: 'I am not sure about these' }
    ]
  },
  {
    id: 'projectExperience',
    type: 'single',
    prompt: 'Have you built anything functional?',
    options: [
      { value: 0, label: 'No, never' },
      { value: 1, label: 'Yes, following a tutorial step-by-step' },
      { value: 2, label: 'Yes, by adapting code I found online' },
      { value: 3, label: 'Yes, from scratch using documentation' }
    ]
  },
  {
    id: 'environmentCheck',
    type: 'checklist',
    prompt: 'Environment & workflow readiness',
    description: 'Let us know what you already have set up.',
    items: [
      {
        id: 'hasCodeEditor',
        label: 'I have a code editor installed (VS Code, etc.)'
      },
      {
        id: 'terminalComfortable',
        label: 'I am comfortable using the terminal/command line'
      }
    ]
  }
];

export const technicalAssessmentConfig = {
  version: TECHNICAL_ASSESSMENT_VERSION,
  questions: technicalAssessmentQuestions
};
