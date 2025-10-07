# Week 1 Integration Example - Brain-Adaptive Learning

This document shows how the new brain-adaptive learning services integrate with the existing sprint completion flow.

---

## 🔄 Complete Flow Example

### Scenario: User Completes Day 5 Sprint on "Java OOP Basics"

```typescript
// 1. USER COMPLETES SPRINT
// Sprint details:
// - Title: "Java OOP Basics - Classes and Objects"
// - Tasks: 5 tasks completed
// - Score: 92/100
// - Time spent: 2.5 hours

// 2. SPRINT COMPLETION HANDLER (Updated)
import skillExtractionService from './services/skillExtractionService.js';
import skillTrackingService from './services/skillTrackingService.js';
import adaptiveLearningService from './services/adaptiveLearningService.js';

async function handleSprintCompletion(params: {
  sprintId: string;
  userId: string;
  score: number;
  completionData: any;
}) {
  const { sprintId, userId, score } = params;

  // Get sprint details
  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    include: {
      objective: true,
      skills: { include: { skill: true } },
    },
  });

  // ============================================
  // STEP 1: EXTRACT SKILLS (if not already extracted)
  // ============================================
  if (sprint.skills.length === 0) {
    console.log('📚 Extracting skills from sprint content...');
    
    const extraction = await skillExtractionService.extractAndMapSkills({
      sprintTitle: sprint.plannerOutput.title,
      sprintDescription: sprint.plannerOutput.description,
      sprintTasks: sprint.plannerOutput.microTasks,
      objectiveContext: sprint.objective.title,
      dayNumber: sprint.dayNumber,
    });

    // Link extracted skills to sprint
    for (const mapped of extraction.mappedSkills) {
      await prisma.sprintSkill.create({
        data: {
          sprintId: sprint.id,
          skillId: mapped.skillId,
          targetLevel: mapped.targetLevel,
          practiceType: mapped.practiceType,
          preSprintLevel: 0, // Will be updated
        },
      });
    }

    console.log(`✅ Extracted ${extraction.extractedSkills.length} skills`);
    // Output: ✅ Extracted 3 skills
    // - Java Classes and Objects
    // - Java Encapsulation
    // - Java Methods
  }

  // ============================================
  // STEP 2: UPDATE SKILL LEVELS
  // ============================================
  console.log('📊 Updating skill levels...');

  const skillScores = sprint.skills.map((ss) => ({
    skillId: ss.skillId,
    score: score, // Use sprint score for all skills (can be more granular)
  }));

  const skillUpdates = await skillTrackingService.updateSkillsFromSprint({
    userId,
    sprintId: sprint.id,
    skillScores,
  });

  console.log(`✅ Updated ${skillUpdates.length} skills`);
  for (const update of skillUpdates) {
    console.log(
      `  - ${update.skillName}: ${update.previousLevel} → ${update.newLevel} (${update.newStatus})`
    );
    if (update.masteredNow) {
      console.log(`    🎉 MASTERED!`);
    }
  }
  // Output:
  // ✅ Updated 3 skills
  //   - Java Classes and Objects: 45 → 60 (practicing)
  //   - Java Encapsulation: 30 → 45 (learning)
  //   - Java Methods: 70 → 85 (proficient)

  // ============================================
  // STEP 3: ANALYZE PERFORMANCE
  // ============================================
  console.log('🔍 Analyzing performance...');

  const performanceAnalysis = await adaptiveLearningService.analyzePerformance({
    objectiveId: sprint.objectiveId,
    userId,
    recentSprintCount: 5,
  });

  console.log(`📈 Performance Analysis:`);
  console.log(`  - Average Score: ${performanceAnalysis.averageScore.toFixed(1)}%`);
  console.log(`  - Trend: ${performanceAnalysis.trend}`);
  console.log(`  - Consistently High: ${performanceAnalysis.consistentlyHigh}`);
  console.log(`  - Struggling Skills: ${performanceAnalysis.strugglingSkills.join(', ') || 'None'}`);
  console.log(`  - Recommended Action: ${performanceAnalysis.recommendedAction}`);
  // Output:
  // 📈 Performance Analysis:
  //   - Average Score: 91.2%
  //   - Trend: improving
  //   - Consistently High: true
  //   - Struggling Skills: None
  //   - Recommended Action: speed_up

  // ============================================
  // STEP 4: RECALIBRATE IF NEEDED
  // ============================================
  if (performanceAnalysis.recommendedAction !== 'maintain') {
    console.log('⚙️ Recalibrating learning path...');

    const adaptationDecision = await adaptiveLearningService.recalibrateLearningPath({
      objectiveId: sprint.objectiveId,
      userId,
      performanceAnalysis,
    });

    console.log(`🎯 Adaptation Decision:`);
    console.log(`  - Should Adjust: ${adaptationDecision.shouldAdjust}`);
    console.log(`  - Type: ${adaptationDecision.adjustmentType}`);
    console.log(`  - New Difficulty: ${adaptationDecision.newDifficulty}/100`);
    console.log(`  - New Velocity: ${adaptationDecision.newVelocity}x`);
    console.log(`  - Reasoning: ${adaptationDecision.reasoning}`);
    console.log(`  - Recommendations:`);
    adaptationDecision.recommendations.forEach((r) => console.log(`    • ${r}`));
    // Output:
    // 🎯 Adaptation Decision:
    //   - Should Adjust: true
    //   - Type: increase
    //   - New Difficulty: 70/100
    //   - New Velocity: 1.3x
    //   - Reasoning: Learner consistently scoring above 90% with improving trend. Ready for increased difficulty.
    //   - Recommendations:
    //     • Increase difficulty and pace
    //     • Add more advanced concepts
    //     • Skip redundant practice
    //     • Introduce OOP inheritance early
    //     • Add challenging projects
  }

  // ============================================
  // STEP 5: ADJUST NEXT SPRINT
  // ============================================
  const nextSprint = await prisma.sprint.findFirst({
    where: {
      objectiveId: sprint.objectiveId,
      dayNumber: sprint.dayNumber + 1,
    },
  });

  if (nextSprint) {
    console.log('🔧 Adjusting next sprint difficulty...');

    const adjustment = await adaptiveLearningService.adjustNextSprintDifficulty({
      objectiveId: sprint.objectiveId,
      userId,
      nextSprintId: nextSprint.id,
      currentPerformance: performanceAnalysis,
    });

    console.log(`✅ Next sprint adjusted:`);
    console.log(`  - Difficulty Change: ${adjustment.difficultyChange > 0 ? '+' : ''}${adjustment.difficultyChange}`);
    console.log(`  - Adjustments Made:`);
    adjustment.adjustmentsMade.forEach((a) => console.log(`    • ${a}`));
    // Output:
    // ✅ Next sprint adjusted:
    //   - Difficulty Change: +20
    //   - Adjustments Made:
    //     • Increased complexity due to high performance
    //     • Added advanced concepts
    //     • Reduced basic explanations
  }

  // ============================================
  // STEP 6: CHECK FOR REVIEW NEEDS
  // ============================================
  console.log('🔄 Checking for skills needing review...');

  const skillsDueForReview = await skillTrackingService.getSkillsDueForReview(userId);

  if (skillsDueForReview.length > 0) {
    console.log(`⚠️ ${skillsDueForReview.length} skills need review:`);
    skillsDueForReview.forEach((skill) => {
      console.log(`  - ${skill.skillName} (${skill.daysSinceLastPractice} days ago)`);
    });
    // Output:
    // ⚠️ 2 skills need review:
    //   - Java Variables and Data Types (14 days ago)
    //   - Java Control Flow (14 days ago)
    
    // TODO: Insert review sprint (Week 2 - Phase 4)
  } else {
    console.log(`✅ No skills need review yet`);
  }

  // ============================================
  // STEP 7: RETURN COMPREHENSIVE RESULT
  // ============================================
  return {
    sprintCompleted: true,
    dayCompleted: sprint.dayNumber,
    score,
    skillUpdates,
    performanceAnalysis,
    adaptationApplied: performanceAnalysis.recommendedAction !== 'maintain',
    nextSprintAdjusted: !!nextSprint,
    reviewNeeded: skillsDueForReview.length > 0,
    notifications: [
      {
        type: 'sprint_completed',
        title: `Day ${sprint.dayNumber} Complete! 🎉`,
        message: `Score: ${score}/100`,
      },
      ...skillUpdates
        .filter((u) => u.masteredNow)
        .map((u) => ({
          type: 'skill_mastered',
          title: `Skill Mastered! 🏆`,
          message: `You've mastered ${u.skillName}!`,
        })),
      ...(performanceAnalysis.recommendedAction === 'speed_up'
        ? [
            {
              type: 'difficulty_increased',
              title: 'Difficulty Increased! 🚀',
              message: `You're doing great! We've increased the difficulty to challenge you more.`,
            },
          ]
        : []),
    ],
  };
}
```

---

## 📊 Example Output Timeline

### Day 1-3: Building Foundation
```
Day 1: Java Basics
  Skills: Java Syntax (0→20), Java Variables (0→25)
  Performance: 85% - Maintain difficulty

Day 2: Variables and Data Types
  Skills: Java Variables (25→45), Java Data Types (0→30)
  Performance: 88% - Maintain difficulty

Day 3: Control Flow
  Skills: Java Control Flow (0→35), Java Methods (0→20)
  Performance: 82% - Maintain difficulty
```

### Day 4-5: Consistent High Performance
```
Day 4: Methods and Functions
  Skills: Java Methods (20→50), Java Arrays (0→30)
  Performance: 92% - Maintain (need 3+ for adjustment)

Day 5: OOP Basics
  Skills: Java Classes (0→60), Java Encapsulation (0→45)
  Performance: 92% - SPEED UP! 🚀
  
  ⚙️ ADAPTATION TRIGGERED:
    - Difficulty: 50 → 70
    - Velocity: 1.0x → 1.3x
    - Estimated Days: 240 → 185 days
```

### Day 6+: Adapted Difficulty
```
Day 6: OOP Advanced (HARDER)
  Skills: Java Inheritance (0→40), Java Polymorphism (0→35)
  Difficulty: 70/100 (increased from 50)
  Performance: 78% - Good! Challenged but not overwhelmed
```

---

## 🎯 Key Integration Points

### 1. Sprint Generation
```typescript
// When generating new sprint, include skill extraction
const newSprint = await plannerService.generateSprint({
  objective,
  learnerProfile,
  dayNumber,
});

// Extract and link skills
const extraction = await skillExtractionService.extractAndMapSkills({
  sprintTitle: newSprint.title,
  sprintTasks: newSprint.microTasks,
  objectiveContext: objective.title,
  dayNumber,
});

// Link skills to sprint
for (const mapped of extraction.mappedSkills) {
  await prisma.sprintSkill.create({
    data: {
      sprintId: newSprint.id,
      skillId: mapped.skillId,
      targetLevel: mapped.targetLevel,
      practiceType: mapped.practiceType,
    },
  });
}
```

### 2. Sprint Completion
```typescript
// After sprint completion, update skills and adapt
const result = await handleSprintCompletion({
  sprintId,
  userId,
  score,
  completionData,
});

// Result includes:
// - skillUpdates: Array of skill level changes
// - performanceAnalysis: Performance metrics
// - adaptationApplied: Whether path was recalibrated
// - notifications: User-facing notifications
```

### 3. Dashboard Display
```typescript
// Get user's skill map for dashboard
const skillMap = await skillTrackingService.getUserSkillMap(userId, objectiveId);

// Display:
// - Overall Progress: 65/100
// - Mastered Skills: 5 skills
// - In Progress: 8 skills
// - Struggling: 2 skills (need review)
```

---

## 🔮 Next Steps (Week 2)

### Phase 3: Knowledge Validation
- Generate quizzes before/after sprints
- Block progression if quiz score < 80%
- Validate understanding before moving forward

### Phase 4: Spaced Repetition
- Automatically insert review sprints
- Schedule reviews at 1, 7, 14, 30, 60 days
- Adjust intervals based on review performance

---

**End of Integration Example**
