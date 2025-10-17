# Lurnix System Analysis & Improvement Roadmap

## Executive Summary

This document analyzes the current Lurnix learning system, identifies critical gaps in user profiling and sprint generation, and provides a comprehensive implementation plan to address three key user segments: absolute beginners, self-taught learners, and career switchers.

**Critical Finding:** The current system measures learning style but fails to assess actual technical competency, resulting in mismatched sprint difficulty and poor user experience for beginners and advanced learners alike.

---

## 1. Current System Analysis

### 1.1 What Currently Works

#### Learning Profile Quiz
```typescript
// Current quiz captures:
interface CurrentProfileData {
  profileType: LearnerProfileType // PRACTICAL_BUILDER, VISUAL_LEARNER, etc.
  learningStyle: {
    visual: number,
    practical: number,
    analytical: number,
    social: number
  },
  motivations: string[],
  challenges: string[],
  timeCommitment: number,
  preferredApproaches: string[]
}
```

**Strengths:**
- ✅ Identifies learning personality (practical vs. theoretical)
- ✅ Captures motivation and time availability
- ✅ Understands how users handle challenges
- ✅ Good foundation for pedagogical adaptation

#### Sprint Generation
- ✅ Creates structured 7-day learning plans
- ✅ Includes tasks, resources, and acceptance criteria
- ✅ Adapts tone based on learning profile type
- ✅ Provides time estimates for tasks

### 1.2 Critical Gaps & Failures

#### Gap 1: No Technical Level Assessment
**Problem:** The system doesn't measure actual coding competency.

**Impact:**
- ❌ Absolute beginners get sprints that assume VS Code is installed
- ❌ Advanced users get basic setup instructions they don't need
- ❌ Time estimates are wildly inaccurate across skill levels
- ❌ Users abandon due to difficulty mismatch

**Example Failure Case:**
```
User: "Complete beginner, never coded"
Objective: "Learn DevOps"
Sprint Generated: 
  - Day 1: "Set up GitHub Actions workflow"
  
Reality: User doesn't know what GitHub is, doesn't have Git installed,
has never used a terminal, doesn't understand what a repository is.

Result: Immediate frustration and abandonment.
```

#### Gap 2: Objective Context Missing
**Problem:** No capture of domain-specific experience when creating objectives.

**Missing Information:**
- Prior knowledge in the target domain
- Related skills already mastered
- Specific urgency (job interview in 2 weeks vs. casual learning)
- Prerequisite understanding

**Example Failure Case:**
```
User A: "Learn React" 
  - Background: Never used JavaScript
  - Needs: 8-12 weeks with JS fundamentals first

User B: "Learn React"
  - Background: 5 years Vue.js experience  
  - Needs: 2 weeks to map concepts

Current System: Generates same sprint for both users.
```

#### Gap 3: No Environment Setup Validation
**Problem:** Sprints assume development environment is ready.

**Missing:**
- Check if user has code editor installed
- Verify command line familiarity
- Confirm version control knowledge
- Validate package manager experience

**Impact:**
- First task failure rate for beginners: ~70%
- Users get stuck before starting actual learning
- No clear path to resolve blockers

#### Gap 4: Inflexible Sprint Structure
**Problem:** All sprints follow same structure regardless of level.

**Issues:**
- Beginners need more setup and fundamentals
- Intermediate users need refresher content
- Advanced users need deep-dive technical content
- Pace doesn't adjust for competency

---

## 2. Target User Segments Analysis

### Segment 1: Absolute Beginners
**Profile:**
- Never written code professionally
- Unfamiliar with development tools
- Needs hand-holding through basics
- High dropout risk if overwhelmed

**Needs:**
- Environment setup as Day 1
- Explanation of every technical term
- Slower pace with more repetition
- Video-heavy resources
- Frequent validation checkpoints

**Example User:**
> "I want to learn web development to change careers from marketing. 
> I've never coded before but I'm motivated."

### Segment 2: Self-Taught / Struggling Learners
**Profile:**
- Has followed tutorials
- Understands basics but gaps in knowledge
- Comfortable with tools but not confident
- Needs structured progression

**Needs:**
- Quick fundamentals review
- Focus on practical application
- Fill knowledge gaps systematically
- Build confidence through projects
- Less hand-holding than beginners

**Example User:**
> "I've done some JavaScript tutorials but I'm lost. I don't know what to learn next 
> or how to build real projects."

### Segment 3: Career Switchers / Intermediate
**Profile:**
- Has coding experience in different domain
- Familiar with development concepts
- Needs to learn specific technologies
- Time-conscious, wants efficiency

**Needs:**
- Skip environmental setup
- Minimal fundamentals
- Direct path to objective
- Advanced resources and challenges
- Faster pace

**Example User:**
> "I'm a Python backend developer learning React for a new role. 
> I understand programming, just need to learn the framework."

---

## 3. Required System Improvements

### 3.1 Enhanced Technical Assessment

#### New Quiz Section: Technical Proficiency
```typescript
interface TechnicalAssessmentQuestions {
  // Core competency check
  codingExperience: {
    question: "Have you written code before?",
    options: [
      {
        value: 'absolute_beginner',
        label: 'Never - Complete beginner',
        implications: {
          needsSetup: true,
          needsBasics: true,
          pace: 0.5x,
          resourceTypes: ['video', 'interactive']
        }
      },
      {
        value: 'beginner',
        label: 'A little - Followed tutorials',
        implications: {
          needsSetup: false,
          needsBasics: true,
          pace: 0.75x,
          resourceTypes: ['video', 'article', 'practice']
        }
      },
      {
        value: 'intermediate',
        label: 'Yes - Have solid foundation',
        implications: {
          needsSetup: false,
          needsBasics: false,
          pace: 1.0x,
          resourceTypes: ['documentation', 'project']
        }
      },
      {
        value: 'advanced',
        label: 'Yes - Code regularly, want to specialize',
        implications: {
          needsSetup: false,
          needsBasics: false,
          pace: 1.5x,
          resourceTypes: ['research', 'advanced_project']
        }
      }
    ]
  },
  
  // Conditional follow-up for beginners
  environmentCheck: {
    condition: "codingExperience === 'absolute_beginner'",
    questions: [
      {
        id: 'has_code_editor',
        question: "Do you have a code editor installed (VS Code, etc.)?",
        type: 'yes_no'
      },
      {
        id: 'terminal_familiarity',
        question: "Are you comfortable using the terminal/command line?",
        type: 'yes_no'
      }
    ]
  },
  
  // Tool familiarity assessment
  toolExperience: {
    question: "Which development tools are you familiar with?",
    type: 'multiple_choice',
    options: [
      'Terminal/Command line',
      'Git/GitHub',
      'Package managers (npm, pip, etc.)',
      'Browser DevTools',
      'None of these'
    ],
    scoring: {
      'None of these': { level: 'absolute_beginner' },
      '1-2 tools': { level: 'beginner' },
      '3+ tools': { level: 'intermediate' }
    }
  },
  
  // Concept understanding
  programmingConcepts: {
    question: "Which programming concepts do you understand?",
    type: 'multiple_choice',
    options: [
      'Variables and data types',
      'Functions and methods',
      'Loops and conditionals',
      'Objects and classes',
      'APIs and HTTP requests',
      'Not sure what these are'
    ],
    scoring: {
      '0-1 concepts': { level: 'absolute_beginner' },
      '2-3 concepts': { level: 'beginner' },
      '4-5 concepts': { level: 'intermediate' },
      'all concepts': { level: 'advanced' }
    }
  },
  
  // Practical experience validation
  projectExperience: {
    question: "Have you built anything functional?",
    options: [
      { value: 0, label: 'No, never' },
      { value: 1, label: 'Yes, following a tutorial step-by-step' },
      { value: 2, label: 'Yes, by adapting code found online' },
      { value: 3, label: 'Yes, from scratch using documentation' }
    ]
  }
}
```

#### Scoring Algorithm
```typescript
interface TechnicalLevelScore {
  overall: 'absolute_beginner' | 'beginner' | 'intermediate' | 'advanced',
  breakdown: {
    coding: number,        // 0-10
    tools: number,         // 0-10
    concepts: number,      // 0-10
    autonomy: number       // 0-10
  },
  flags: {
    needsEnvironmentSetup: boolean,
    needsTerminalIntro: boolean,
    needsGitIntro: boolean,
    hasProjectExperience: boolean,
    canWorkIndependently: boolean
  }
}

function calculateTechnicalLevel(answers: TechnicalAssessmentAnswers): TechnicalLevelScore {
  // Weight different factors
  const codingScore = answers.codingExperience.value * 2.5
  const toolScore = (answers.toolExperience.selected.length / 4) * 10
  const conceptScore = (answers.programmingConcepts.selected.length / 6) * 10
  const autonomyScore = answers.projectExperience.value * 2.5
  
  const overallScore = (codingScore + toolScore + conceptScore + autonomyScore) / 4
  
  // Determine overall level
  let overall: string
  if (overallScore < 2) overall = 'absolute_beginner'
  else if (overallScore < 5) overall = 'beginner'
  else if (overallScore < 8) overall = 'intermediate'
  else overall = 'advanced'
  
  return {
    overall,
    breakdown: {
      coding: codingScore,
      tools: toolScore,
      concepts: conceptScore,
      autonomy: autonomyScore
    },
    flags: {
      needsEnvironmentSetup: toolScore < 2,
      needsTerminalIntro: !answers.toolExperience.includes('Terminal'),
      needsGitIntro: !answers.toolExperience.includes('Git'),
      hasProjectExperience: autonomyScore > 0,
      canWorkIndependently: autonomyScore >= 2
    }
  }
}
```

### 3.2 Objective Context Capture

#### Domain-Specific Questions
```typescript
interface ObjectiveContextQuestions {
  // Asked when user creates objective
  priorKnowledge: {
    question: "What related skills do you already have for '{objective}'?",
    type: 'text_with_suggestions',
    examples: {
      'Learn React': ['JavaScript', 'HTML/CSS', 'Vue.js', 'Angular'],
      'Learn DevOps': ['Linux', 'Docker', 'CI/CD', 'Cloud platforms'],
      'Learn Python': ['Another programming language', 'Data analysis', 'Scripting']
    },
    aiProcessing: true // AI analyzes free text to extract relevant skills
  },
  
  urgency: {
    question: "What's driving your timeline?",
    options: [
      {
        value: 'interview',
        label: 'Job interview in 1-4 weeks',
        sprintStrategy: 'focused_essentials',
        estimateModifier: 0.5 // Compressed timeline
      },
      {
        value: 'job_requirement',
        label: 'Need it for current/new job',
        sprintStrategy: 'practical_fast_track',
        estimateModifier: 0.75
      },
      {
        value: 'personal_project',
        label: 'Building a personal project',
        sprintStrategy: 'project_based',
        estimateModifier: 1.0
      },
      {
        value: 'career_growth',
        label: 'Long-term career development',
        sprintStrategy: 'comprehensive_mastery',
        estimateModifier: 1.25
      }
    ]
  },
  
  depthPreference: {
    question: "How deep do you want to go?",
    options: [
      'Just enough to get started',
      'Solid practical skills',
      'Deep understanding and mastery'
    ]
  }
}
```

### 3.3 Adaptive Sprint Generation

#### Level-Based Sprint Templates
```typescript
interface SprintGenerationStrategy {
  absolute_beginner: {
    day1Requirements: [
      'Environment setup walkthrough',
      'Terminal/CLI introduction',
      'First "Hello World" validation',
      'Tool familiarity building'
    ],
    pacing: {
      tasksPerDay: 2-3,
      minutesPerTask: 30-60,
      breakdownLevel: 'extremely_detailed',
      assumeNothing: true
    },
    resources: {
      prioritize: ['video', 'interactive_tutorial'],
      avoid: ['dense_documentation', 'research_papers'],
      includeTranscripts: true
    },
    language: {
      explainEverything: true,
      defineTerms: true,
      useAnalogies: true,
      encouragementLevel: 'high'
    }
  },
  
  beginner: {
    day1Requirements: [
      'Quick environment verification',
      'Fundamentals review',
      'First practical task'
    ],
    pacing: {
      tasksPerDay: 3-4,
      minutesPerTask: 45-90,
      breakdownLevel: 'detailed',
      assumeNothing: false
    },
    resources: {
      prioritize: ['video', 'article', 'practice_exercises'],
      balance: 'theory_and_practice',
      includeCheatSheets: true
    },
    language: {
      explainConcepts: true,
      defineComplexTerms: true,
      encouragementLevel: 'moderate'
    }
  },
  
  intermediate: {
    day1Requirements: [
      'Quick context setting',
      'Core objective start',
      'First meaningful deliverable'
    ],
    pacing: {
      tasksPerDay: 4-5,
      minutesPerTask: 60-120,
      breakdownLevel: 'structured',
      assumeBasics: true
    },
    resources: {
      prioritize: ['documentation', 'best_practices', 'projects'],
      includeAdvancedPatterns: true,
      officialDocsFirst: true
    },
    language: {
      technical: true,
      concise: true,
      challengeUser: true,
      encouragementLevel: 'low'
    }
  },
  
  advanced: {
    day1Requirements: [
      'Advanced concept introduction',
      'Complex problem solving',
      'Research-based exploration'
    ],
    pacing: {
      tasksPerDay: 3-4,
      minutesPerTask: 90-180,
      breakdownLevel: 'high_level',
      assumeExpertise: true
    },
    resources: {
      prioritize: ['research', 'source_code', 'case_studies'],
      includeEdgeCases: true,
      architecturalPatterns: true
    },
    language: {
      technical: true,
      minimal: true,
      assumeKnowledge: true,
      encouragementLevel: 'none'
    }
  }
}
```

#### Enhanced AI Prompt Generation
```typescript
class AdaptivePromptGenerator {
  generateSprintPrompt(
    objective: Objective,
    userProfile: EnhancedProfile,
    context: ObjectiveContext
  ): string {
    const level = userProfile.technicalLevel.overall
    const strategy = SPRINT_STRATEGIES[level]
    
    return `You are Lurnix, an expert learning path creator. Generate a 7-day sprint.

CRITICAL USER LEVEL: ${level.toUpperCase()}
${this.getLevelSpecificInstructions(level)}

USER CONTEXT:
- Learning Profile: ${userProfile.profileType}
- Technical Level: ${level}
- Prior Knowledge: ${context.priorKnowledge.join(', ')}
- Urgency: ${context.urgency}
- Time Commitment: ${userProfile.timeCommitmentHours}h/week

OBJECTIVE: "${objective.primaryGoal}"

MANDATORY ADAPTATIONS FOR ${level.toUpperCase()}:

${level === 'absolute_beginner' ? `
DAY 1 MUST BE ENVIRONMENT SETUP:
✅ Install VS Code or preferred editor
✅ Set up terminal basics
✅ Create first project folder
✅ Validate "Hello World" works
✅ Introduce version control basics

EXPLAIN EVERYTHING:
- Define every technical term
- Use analogies and metaphors
- Include screenshots/video resources
- Validate understanding at each step
- Build confidence gradually

PACING:
- Max 2-3 tasks per day
- 30-60 minutes per task
- Include breaks and reflection time
- Celebrate small wins

RESOURCES:
- 80% video tutorials (beginner-friendly)
- 20% interactive exercises
- NO dense documentation
- Include setup troubleshooting guides
` : ''}

${level === 'beginner' ? `
DAY 1: Quick Setup Verification + Fundamentals Review
✅ Verify environment ready
✅ Review key concepts needed
✅ Start first meaningful task

PACING:
- 3-4 tasks per day
- 45-90 minutes per task
- Balance learning and practice

RESOURCES:
- Mix of video and written tutorials
- Practice exercises after concepts
- Include cheat sheets
` : ''}

${level === 'intermediate' ? `
DAY 1: Dive into Core Objective
✅ Brief context setting
✅ Start with meaningful work
✅ First deliverable by end of day

PACING:
- 4-5 tasks per day
- 60-120 minutes per task
- Focus on practical application

RESOURCES:
- Official documentation
- Best practices guides
- Real-world project examples
- Minimize hand-holding
` : ''}

${level === 'advanced' ? `
DAY 1: Advanced Concepts & Architecture
✅ Deep technical exploration
✅ Complex problem solving
✅ Production-level considerations

PACING:
- 3-4 tasks per day
- 90-180 minutes per task
- Self-directed research

RESOURCES:
- Source code and research papers
- Advanced case studies
- Architectural patterns
- Assume expert knowledge
` : ''}

SPRINT STRUCTURE:
${this.getStructureTemplate(level, strategy)}

Respond with complete 7-day sprint JSON matching schema.`
  }
  
  private getLevelSpecificInstructions(level: string): string {
    const instructions = {
      absolute_beginner: `
⚠️ CRITICAL: User has NEVER coded before.
- Start with environment setup
- Explain EVERY technical term
- Use simple, non-technical language
- Include troubleshooting for common setup issues
- Validate basic understanding before moving forward
- Make first day entirely about getting set up successfully`,
      
      beginner: `
User has basic familiarity but needs structured guidance.
- Quick verification of setup
- Review fundamentals they might have missed
- Build confidence through practical exercises
- Explain concepts but don't assume knowledge`,
      
      intermediate: `
User has solid foundation. Skip basics.
- Go directly to objective
- Use technical language
- Provide challenging exercises
- Focus on best practices and patterns`,
      
      advanced: `
User is experienced. Challenge them.
- Advanced concepts from day 1
- Minimal explanation
- Complex, realistic scenarios
- Encourage independent research`
    }
    
    return instructions[level]
  }
}
```

### 3.4 Duration Estimation Enhancement

#### Context-Aware Time Calculation
```typescript
interface DurationEstimator {
  estimateObjectiveDuration(
    objective: Objective,
    technicalLevel: TechnicalLevel,
    priorKnowledge: string[],
    context: ObjectiveContext
  ): DurationEstimate {
    
    // Base estimate for objective complexity
    let baseWeeks = this.getBaseComplexity(objective.primaryGoal)
    
    // Adjust for technical level
    const levelModifiers = {
      absolute_beginner: 2.0,  // Takes 2x longer
      beginner: 1.5,
      intermediate: 1.0,
      advanced: 0.7
    }
    
    baseWeeks *= levelModifiers[technicalLevel.overall]
    
    // Adjust for prior knowledge
    const relevantSkills = this.extractRelevantSkills(
      priorKnowledge, 
      objective.primaryGoal
    )
    
    if (relevantSkills.length > 0) {
      const knowledgeDiscount = Math.min(relevantSkills.length * 0.15, 0.5)
      baseWeeks *= (1 - knowledgeDiscount)
    }
    
    // Adjust for urgency (can compress if needed)
    if (context.urgency === 'interview') {
      baseWeeks = Math.max(baseWeeks * 0.5, 2) // Minimum 2 weeks
    }
    
    // Adjust for time commitment
    const weeklyHours = context.timeCommitmentHours
    if (weeklyHours < 5) {
      baseWeeks *= 1.5 // Part-time learner needs more calendar time
    } else if (weeklyHours > 15) {
      baseWeeks *= 0.8 // Full-time learner can accelerate
    }
    
    return {
      estimatedWeeks: Math.ceil(baseWeeks),
      estimatedSprints: Math.ceil(baseWeeks),
      totalHours: Math.ceil(baseWeeks * weeklyHours),
      confidence: this.calculateConfidence(technicalLevel, priorKnowledge),
      reasoning: this.generateReasoning(baseWeeks, levelModifiers, context)
    }
  }
}
```

---

## 4. Database Schema Changes

### Enhanced User Profile Table
```sql
ALTER TABLE user_profiles ADD COLUMN technical_level JSONB DEFAULT '{
  "overall": "beginner",
  "breakdown": {
    "coding": 5,
    "tools": 5,
    "concepts": 5,
    "autonomy": 5
  },
  "flags": {
    "needsEnvironmentSetup": false,
    "needsTerminalIntro": false,
    "needsGitIntro": false,
    "hasProjectExperience": false,
    "canWorkIndependently": false
  }
}'::jsonb;

ALTER TABLE user_profiles ADD COLUMN assessment_completed_at TIMESTAMP;
ALTER TABLE user_profiles ADD COLUMN assessment_version VARCHAR(20) DEFAULT 'v1.0';
```

### Objective Context Table
```sql
CREATE TABLE objective_contexts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID NOT NULL REFERENCES learning_objectives(id),
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- Prior knowledge
  prior_knowledge JSONB DEFAULT '[]',
  relevant_experience TEXT,
  related_skills JSONB DEFAULT '[]',
  
  -- Urgency and timeline
  urgency VARCHAR(50),
  specific_deadline DATE,
  urgency_reason TEXT,
  
  -- Depth preference
  depth_preference VARCHAR(50),
  focus_areas JSONB DEFAULT '[]',
  
  -- AI-extracted metadata
  extracted_skills JSONB DEFAULT '[]',
  complexity_assessment JSONB,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Sprint Generation Metadata Table
```sql
ALTER TABLE seven_day_roadmaps 
ADD COLUMN user_technical_level VARCHAR(20),
ADD COLUMN generation_strategy VARCHAR(50),
ADD COLUMN level_adaptations JSONB,
ADD COLUMN estimated_vs_actual JSONB;

CREATE INDEX idx_roadmaps_technical_level 
ON seven_day_roadmaps(user_technical_level);
```

---

## 5. Implementation Plan

### Phase 1: Foundation (Week 1-2)
**Goal:** Add technical assessment to onboarding

**Tasks:**
1. Design and implement technical assessment questions
2. Create scoring algorithm for technical level
3. Update user profile schema
4. Store technical level in database
5. Display technical level to users for validation

**Deliverables:**
- Enhanced quiz with technical assessment
- Technical level calculation service
- Database migrations
- User profile API updates

**Success Metrics:**
- 90%+ quiz completion rate
- Technical level distribution makes sense (bell curve)
- Users agree with their assessed level (survey)

### Phase 2: Context Capture (Week 3)
**Goal:** Gather objective-specific context

**Tasks:**
1. Implement contextual questions during objective creation
2. Build AI skill extraction service (analyze free text)
3. Create objective context storage
4. Update objective creation API
5. Display context summary to users

**Deliverables:**
- Objective context questionnaire
- Skill extraction AI service
- Enhanced objective creation flow
- Context validation UI

**Success Metrics:**
- 80%+ users complete context questions
- AI skill extraction 75%+ accuracy
- Richer objective data available for sprint generation

### Phase 3: Adaptive Sprint Generation (Week 4-5)
**Goal:** Generate sprints matched to user level

**Tasks:**
1. Implement level-specific sprint strategies
2. Enhance AI prompt generation with level adaptations
3. Add environment setup detection and day 1 generation
4. Create resource type filtering by level
5. Implement pacing adjustments
6. Add sprint quality validation

**Deliverables:**
- Adaptive prompt generator service
- Level-specific sprint templates
- Enhanced sprint generation API
- Sprint quality metrics

**Success Metrics:**
- Sprint difficulty matches user level (survey)
- Task completion rate improves 40%+
- User satisfaction score increases 2+ points
- Dropout rate decreases 30%+

### Phase 4: Enhanced Duration Estimation (Week 6)
**Goal:** Accurate time estimates based on level and context

**Tasks:**
1. Implement context-aware duration estimator
2. Add prior knowledge impact calculation
3. Create urgency-based timeline compression
4. Build confidence scoring for estimates
5. Track actual vs. estimated time

**Deliverables:**
- Enhanced duration estimation service
- Estimate confidence scoring
- Actual vs. estimated tracking
- Estimate accuracy reporting

**Success Metrics:**
- Duration estimates within ±30% of actual
- Users find timelines realistic (survey)
- Better retention through accurate expectations

### Phase 5: Continuous Improvement (Week 7-8)
**Goal:** Monitor, measure, and optimize

**Tasks:**
1. Implement analytics dashboard
2. Track sprint completion rates by level
3. Measure resource engagement by type
4. A/B test different sprint structures
5. Collect user feedback systematically
6. Iterate on prompts based on data

**Deliverables:**
- Analytics dashboard
- A/B testing framework
- Feedback collection system
- Optimization playbook

**Success Metrics:**
- Data-driven decisions for improvements
- Continuous improvement in completion rates
- High user satisfaction maintained

---

## 6. Testing Strategy

### Unit Tests
```typescript
describe('TechnicalLevelAssessment', () => {
  test('absolute beginner detection', () => {
    const answers = {
      codingExperience: 'absolute_beginner',
      toolExperience: [],
      programmingConcepts: []
    }
    const level = calculateTechnicalLevel(answers)
    expect(level.overall).toBe('absolute_beginner')
    expect(level.flags.needsEnvironmentSetup).toBe(true)
  })
  
  test('intermediate with prior knowledge', () => {
    const answers = {
      codingExperience: 'intermediate',
      toolExperience: ['Terminal', 'Git', 'npm'],
      programmingConcepts: ['Variables', 'Functions', 'Objects', 'APIs']
    }
    const level = calculateTechnicalLevel(answers)
    expect(level.overall).toBe('intermediate')
    expect(level.flags.needsEnvironmentSetup).toBe(false)
  })
})

describe('AdaptiveSprintGeneration', () => {
  test('beginner gets environment setup day 1', () => {
    const sprint = generateSprint(beginnerProfile, reactObjective)
    expect(sprint.dailyPlans[0].title).toContain('Setup')
    expect(sprint.dailyPlans[0].activities).toContainEqual(
      expect.objectContaining({ type: 'setup' })
    )
  })
  
  test('advanced user skips basics', () => {
    const sprint = generateSprint(advancedProfile, reactObjective)
    expect(sprint.dailyPlans[0].title).not.toContain('Setup')
    expect(sprint.dailyPlans[0].activities[0].type).toBe('advanced_concept')
  })
})
```

### Integration Tests
- End-to-end quiz → profile → objective → sprint flow
- Verify database updates at each step
- Test AI prompt generation for all levels
- Validate resource selection logic

### User Acceptance Tests
- 10 beta users per level category
- Monitor completion rates
- Collect qualitative feedback
- Measure satisfaction scores
- Track time to first task completion

---

## 7. Success Metrics & KPIs

### Primary Metrics
- **Sprint Completion Rate by Level:**
  - Absolute Beginner: Target 70%+ (currently ~30%)
  - Beginner: Target 75%+ (currently ~50%)
  - Intermediate: Target 85%+ (currently ~70%)
  - Advanced: Target 90%+ (currently ~60%)

- **User Satisfaction:** Target 8.5/10 across all levels
- **Accurate Level Assessment:** 85%+ users agree with assigned level
- **Task Completion Rate:** Improve by 40% overall
- **Retention:** 30% reduction in first-week dropout

### Secondary Metrics
- Time to complete first task (should decrease)
- Support ticket volume (should decrease)
- Resource engagement rate (should increase)
- Objective achievement rate (should increase)
- Net Promoter Score (should increase)

---

## 8. Risk Mitigation

### Technical Risks
**Risk:** AI prompt becomes too complex and slow
**Mitigation:** Implement caching, use Groq for production, optimize prompt length

**Risk:** Database schema changes break existing features
**Mitigation:** Backward compatible migrations, feature flags, gradual rollout

### User Experience Risks
**Risk:** Longer quiz reduces conversion
**Mitigation:** Progressive disclosure, save progress, show value proposition

**Risk:** Users disagree with assessed level
**Mitigation:** Allow level adjustment, transparent scoring, validation step

### Business Risks
**Risk:** Implementation timeline delays launch
**Mitigation:** Phase approach, MVP first, iterate quickly

**Risk:** Increased complexity without clear ROI
**Mitigation:** Measure everything, kill what doesn't work, focus on completion rates

---

## 9. Conclusion

The current Lurnix system has a strong foundation in learning style assessment but critically lacks technical competency evaluation. This gap causes significant user experience issues, particularly for absolute beginners who get overwhelmed and advanced users who get bored.

**Critical Path:**
1. Add technical assessment (Week 1-2)
2. Implement adaptive sprint generation (Week 3-5)
3. Measure and optimize (Week 6-8)

**Expected Impact:**
- 40-50% improvement in sprint completion rates
- 30% reduction in first-week dropout
- 2+ point increase in user satisfaction scores
- More accurate duration estimates (±30% vs. current ±100%)
- Better user outcomes and learning success

**Investment Required:**
- Development: 6-8 weeks
- Testing: 2 weeks
- Rollout: 2 weeks
- Total: ~10-12 weeks for full implementation

**Return on Investment:**
- Reduced churn = higher LTV
- Better word-of-mouth = lower CAC
- Improved completion rates = stronger proof of concept
- Foundation for premium features (career switcher tracks, interview prep)

---

## 10. API Endpoint Changes

### New Endpoints Required

#### Technical Assessment
```
POST /api/assessment/technical
Body: {
  coding_experience: string,
  tool_experience: string[],
  programming_concepts: string[],
  project_experience: number,
  environment_check?: {
    has_code_editor: boolean,
    terminal_familiarity: boolean
  }
}
Response: {
  technical_level: TechnicalLevelScore,
  recommendations: string[],
  next_steps: string[]
}

GET /api/assessment/questions
Query: ?profile_type=string&coding_experience=string
Response: {
  questions: ConditionalQuestion[],
  estimated_duration: number
}
```

#### Enhanced Objective Creation
```
POST /api/objectives (Enhanced)
Body: {
  // Existing fields
  primary_goal: string,
  learning_reason: string,
  time_commitment_hours: number,
  
  // New context fields
  prior_knowledge: string,  // Free text
  related_skills: string[], // Selected from suggestions
  urgency: string,
  specific_deadline?: Date,
  depth_preference: string,
  domain_experience?: string
}
Response: {
  objective: LearningObjective,
  context: ObjectiveContext,
  duration_estimate: DurationEstimate,
  extracted_skills: string[], // AI-parsed from prior_knowledge
  recommendations: string[]
}

GET /api/objectives/:id/context-suggestions
Response: {
  suggested_skills: string[],  // Based on objective + profile
  relevant_questions: ContextualQuestion[],
  example_prior_knowledge: string[]
}
```

#### Adaptive Sprint Generation
```
POST /api/objectives/:id/sprints/generate (Enhanced)
Headers: Authorization
Response: {
  sprint: SevenDayRoadmap,
  generation_metadata: {
    user_level: string,
    strategy_used: string,
    adaptations_applied: string[],
    generation_time: number,
    confidence_score: number
  },
  level_explanation: string,  // Why this structure was chosen
  alternative_available: boolean
}

GET /api/sprints/:id/alternatives
Query: ?target_level=string
Response: {
  alternative_sprints: SevenDayRoadmap[],
  comparison: SprintComparison
}
```

#### User Feedback & Validation
```
POST /api/assessment/validate
Body: {
  assessed_level: string,
  user_agrees: boolean,
  user_feedback?: string,
  suggested_level?: string
}
Response: {
  updated_profile: UserProfile,
  adjustment_made: boolean
}

POST /api/sprints/:id/difficulty-feedback
Body: {
  too_easy: boolean,
  too_hard: boolean,
  just_right: boolean,
  specific_feedback: string,
  time_actual_vs_estimated: {
    task_id: string,
    estimated_minutes: number,
    actual_minutes: number
  }[]
}
Response: {
  feedback_recorded: boolean,
  level_adjustment_suggested: boolean,
  next_sprint_adaptation: string[]
}
```

---

## 11. Frontend Changes Required

### Enhanced Quiz Flow
```typescript
// New quiz section after learning style questions
interface EnhancedQuizFlow {
  sections: [
    'learning_style',      // Existing
    'motivations',         // Existing  
    'technical_assessment', // NEW
    'review_and_confirm'   // NEW
  ]
}

// Progressive disclosure for technical assessment
if (codingExperience === 'absolute_beginner') {
  showAdditionalQuestions([
    'environment_check',
    'learning_resources_preference',
    'support_needs'
  ])
}
```

### Objective Creation Enhancement
```typescript
interface ObjectiveCreationUI {
  steps: [
    {
      title: 'What do you want to learn?',
      fields: ['primary_goal', 'learning_reason']
    },
    {
      title: 'Your experience in this area',  // NEW
      fields: ['prior_knowledge', 'related_skills'],
      features: {
        aiSuggestions: true,
        skillAutocomplete: true,
        examplePrompts: true
      }
    },
    {
      title: 'Timeline and urgency',  // NEW
      fields: ['urgency', 'time_commitment', 'deadline']
    },
    {
      title: 'Review and generate',
      preview: {
        estimatedDuration: true,
        learningPath: true,
        firstSprintPreview: true
      }
    }
  ]
}
```

### Sprint Display Adaptations
```typescript
interface SprintDisplayAdaptations {
  // Show level badge
  levelIndicator: {
    show: true,
    position: 'header',
    allowAdjustment: true  // User can request different difficulty
  },
  
  // Adapt UI based on level
  beginnerMode: {
    showTooltips: true,
    expandedInstructions: true,
    videoFirst: true,
    progressCheckpoints: 'frequent'
  },
  
  advancedMode: {
    compactView: true,
    quickAccess: true,
    minimalGuidance: true,
    resourcesCollapsed: false
  }
}
```

### User Dashboard Enhancements
```typescript
interface DashboardEnhancements {
  profileSection: {
    technicalLevel: {
      display: true,
      editable: true,
      showBreakdown: true,
      retakeAssessment: true
    }
  },
  
  objectivesList: {
    showContext: true,
    displayPriorKnowledge: true,
    progressAccuracy: true  // Actual vs estimated time
  },
  
  sprintView: {
    levelAdaptedLayout: true,
    difficultyFeedback: true,
    alternativeSprintsAccess: true
  }
}
```

---

## 12. AI Service Enhancements

### Prompt Optimization
```typescript
interface OptimizedPromptStrategy {
  // Reduce token count while maintaining quality
  tokenBudget: {
    absolute_beginner: 2000,  // More detailed instructions needed
    beginner: 1500,
    intermediate: 1200,
    advanced: 1000
  },
  
  // Template-based generation
  useTemplates: true,
  templates: {
    environment_setup: EnvironmentSetupTemplate,
    fundamentals_review: FundamentalsTemplate,
    direct_objective: DirectObjectiveTemplate,
    advanced_concepts: AdvancedConceptsTemplate
  },
  
  // Streaming for better UX
  enableStreaming: true,
  progressiveDisplay: true
}
```

### Skill Extraction Service
```typescript
interface SkillExtractionService {
  extractSkills(freeText: string, objectiveDomain: string): Promise<ExtractedSkills> {
    // Use AI to parse user's prior knowledge description
    const prompt = `Extract technical skills from this text: "${freeText}"
    Context: User wants to learn ${objectiveDomain}
    
    Return JSON array of skills with confidence scores.`
    
    // Example input: "I know some JavaScript and have built websites with HTML/CSS"
    // Output: ['JavaScript', 'HTML', 'CSS', 'Web Development']
  }
  
  suggestRelatedSkills(objective: string, profile: UserProfile): string[] {
    // Based on objective + profile, suggest what might be relevant
    // Example: "Learn React" → suggests checking for JS, HTML, CSS knowledge
  }
}
```

### Duration Estimation AI
```typescript
interface DurationEstimationAI {
  estimateWithAI(context: EstimationContext): Promise<DurationEstimate> {
    const prompt = `Estimate learning duration for this objective.

Objective: "${context.objective}"
User Level: ${context.technicalLevel}
Prior Knowledge: ${context.priorKnowledge.join(', ')}
Time Commitment: ${context.hoursPerWeek}h/week
Urgency: ${context.urgency}

Consider:
1. Complexity of objective
2. User's current level vs. target level
3. Related skills they already have
4. Realistic learning pace
5. Necessary prerequisites

Respond with JSON:
{
  "estimatedWeeks": number,
  "totalHours": number,
  "prerequisites": ["prerequisite1"],
  "reasoning": "explanation",
  "confidence": number (0-100),
  "accelerationPossible": boolean,
  "riskFactors": ["factor1"]
}`
  }
}
```

---

## 13. Monitoring & Analytics

### Key Metrics to Track

#### User Level Distribution
```sql
-- Monitor technical level distribution
SELECT 
  technical_level->>'overall' as level,
  COUNT(*) as users,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM user_profiles
WHERE technical_level IS NOT NULL
GROUP BY technical_level->>'overall'
ORDER BY 
  CASE technical_level->>'overall'
    WHEN 'absolute_beginner' THEN 1
    WHEN 'beginner' THEN 2
    WHEN 'intermediate' THEN 3
    WHEN 'advanced' THEN 4
  END;
```

#### Sprint Success by Level
```sql
-- Track completion rates by technical level
SELECT 
  user_technical_level,
  COUNT(*) as total_sprints,
  SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
  ROUND(AVG(progress), 2) as avg_progress,
  ROUND(AVG(completed_days), 2) as avg_days_completed
FROM seven_day_roadmaps
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY user_technical_level
ORDER BY user_technical_level;
```

#### Time Accuracy Tracking
```sql
-- Compare estimated vs actual time
SELECT 
  objective_id,
  user_technical_level,
  estimated_total_hours,
  SUM(time_spent) as actual_hours,
  ROUND((SUM(time_spent) - estimated_total_hours) * 100.0 / estimated_total_hours, 2) as variance_percent
FROM (
  SELECT 
    r.objective_id,
    r.user_technical_level,
    o.estimated_total_hours,
    -- Aggregate actual time from task completions
    COALESCE(SUM((dp->>'actual_minutes')::int), 0) / 60.0 as time_spent
  FROM seven_day_roadmaps r
  JOIN learning_objectives o ON r.objective_id = o.id
  LEFT JOIN LATERAL jsonb_array_elements(daily_plans) dp ON true
  WHERE r.status = 'completed'
  GROUP BY r.id, r.objective_id, r.user_technical_level, o.estimated_total_hours
) subquery
GROUP BY objective_id, user_technical_level, estimated_total_hours;
```

### Analytics Dashboard Requirements
```typescript
interface AnalyticsDashboard {
  sections: {
    userDistribution: {
      technicalLevels: PieChart,
      learningProfiles: PieChart,
      experienceLevels: BarChart
    },
    
    engagementMetrics: {
      completionRateByLevel: LineChart,
      dropoffPoints: HeatMap,
      timeSpentByLevel: BarChart,
      resourceEngagement: StackedBarChart
    },
    
    qualityMetrics: {
      userSatisfaction: LineChart,
      difficultyRatings: BarChart,
      levelAccuracy: GaugeChart,
      estimationAccuracy: ScatterPlot
    },
    
    businessMetrics: {
      retentionByLevel: LineChart,
      upgradeRates: BarChart,
      referralsByLevel: BarChart,
      ltv_by_level: BarChart
    }
  }
}
```

---

## 14. Rollout Strategy

### Phase 0: Preparation (Week -1)
- Database migrations tested in staging
- Feature flags implemented
- Rollback plan documented
- Support team trained
- Communication plan ready

### Phase 1: Silent Release (Week 1)
- Deploy to 5% of new users
- Monitor metrics closely
- Collect qualitative feedback
- Fix critical bugs
- No public announcement

### Phase 2: Beta Release (Week 2-3)
- Expand to 25% of new users
- Invite existing users to retake assessment (opt-in)
- Gather extensive feedback
- Iterate on prompts and UI
- Begin marketing soft launch

### Phase 3: Full Release (Week 4)
- Deploy to 100% of users
- Announce new features
- Update marketing materials
- Monitor support volume
- Celebrate wins

### Phase 4: Optimization (Week 5-8)
- A/B test variations
- Optimize prompts based on data
- Fine-tune level thresholds
- Improve resource recommendations
- Scale successful patterns

---

## 15. Success Criteria & Go/No-Go Decision Points

### Week 2 Checkpoint (5% Rollout)
**Go Criteria:**
- ✅ Technical level assessment 90%+ completion rate
- ✅ No critical bugs in production
- ✅ Sprint generation latency < 30 seconds
- ✅ User feedback 7/10 or higher

**No-Go Criteria:**
- ❌ Assessment completion < 70%
- ❌ Critical production issues
- ❌ Generation failures > 10%
- ❌ Negative user feedback

### Week 3 Checkpoint (25% Rollout)
**Go Criteria:**
- ✅ Sprint completion rate improved 15%+
- ✅ Technical level agreement 80%+
- ✅ Support tickets stable or decreasing
- ✅ No data integrity issues

**No-Go Criteria:**
- ❌ Completion rate declined
- ❌ Users disagree with level > 30%
- ❌ Support tickets increased 50%+
- ❌ Data corruption or loss

### Week 4 Checkpoint (Full Release)
**Go Criteria:**
- ✅ All previous criteria maintained
- ✅ Positive sentiment in feedback
- ✅ System performance stable
- ✅ Team confident in rollout

---

## 16. Long-Term Roadmap

### Q1: Foundation (Current Sprint)
- ✅ Technical assessment
- ✅ Adaptive sprint generation
- ✅ Context capture
- ✅ Improved estimates

### Q2: Intelligence Layer
- 🔄 Dynamic difficulty adjustment during sprints
- 🔄 Predictive dropout prevention
- 🔄 Automated prerequisite detection
- 🔄 Personalized resource ranking

### Q3: Specialization Tracks
- 📅 Interview preparation mode (compressed, focused)
- 📅 Career switcher track (comprehensive, supportive)
- 📅 Project-based learning (deliverable-focused)
- 📅 Certification preparation

### Q4: Social & Advanced Features
- 📅 Peer matching by level
- 📅 Mentor assignment for advanced users
- 📅 Portfolio generation from deliverables
- 📅 Skills validation and badging

---

## 17. Appendix: Example Scenarios

### Scenario 1: Complete Beginner
**Profile:**
- Never coded before
- Marketing professional
- Wants to build personal website
- 5 hours/week available

**Journey:**
1. Takes enhanced quiz
2. Assessed as "absolute_beginner"
3. Creates objective: "Build my first website"
4. System estimates: 6 weeks
5. First sprint generated:
   - Day 1: Environment setup + Hello World
   - Day 2-3: HTML basics
   - Day 4-5: CSS styling
   - Day 6-7: First complete page
6. Completes sprint successfully
7. Confidence increases, continues to week 2

**Outcome:** User doesn't get overwhelmed, sees progress, stays engaged.

### Scenario 2: Self-Taught Developer
**Profile:**
- Followed tutorials
- Built small projects
- Knows JavaScript basics
- Wants to learn React
- 10 hours/week available

**Journey:**
1. Takes enhanced quiz
2. Assessed as "beginner" 
3. Creates objective: "Master React for job applications"
4. Indicates prior knowledge: "JavaScript, HTML, CSS"
5. System estimates: 4 weeks
6. First sprint generated:
   - Day 1: Quick JS review + React introduction
   - Day 2-3: Components and JSX
   - Day 4-5: State and props
   - Day 6-7: First interactive app
7. Completes sprint, requests more challenge
8. Next sprint adapts to intermediate level

**Outcome:** User doesn't waste time on basics, stays challenged, progresses faster.

### Scenario 3: Career Switcher (Advanced)
**Profile:**
- 5 years Python backend experience
- Wants to learn frontend (React)
- Job interview in 3 weeks
- 20 hours/week available

**Journey:**
1. Takes enhanced quiz
2. Assessed as "advanced" (programming) + "beginner" (React)
3. Creates objective: "Learn React for frontend role"
4. Indicates: "Python expert, some JavaScript, never React"
5. Urgency: Job interview
6. System estimates: 3 weeks (compressed)
7. First sprint generated:
   - Day 1: React ecosystem overview + first component
   - Day 2: State management deep dive
   - Day 3-4: Advanced patterns (context, hooks)
   - Day 5: Performance optimization
   - Day 6-7: Build production-quality app
8. Fast pace, technical resources, minimal explanation
9. Completes successfully, ready for interview

**Outcome:** Efficient path, no time wasted, interview-ready quickly.

