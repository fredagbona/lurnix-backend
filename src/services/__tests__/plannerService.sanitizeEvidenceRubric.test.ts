import assert from 'node:assert/strict';
import test from 'node:test';
import { plannerServiceTestables } from '../plannerService.js';

test('ensureProjectEvidenceRubrics injects default rubric for missing project evidence', () => {
  const rawPlan = {
    id: 'spr_mock',
    title: 'Mock plan',
    description: 'A mock sprint plan for testing.',
    lengthDays: 1,
    totalEstimatedHours: 5,
    difficulty: 'beginner',
    projects: [
      {
        id: 'proj_missing_rubric',
        title: 'Project missing rubric',
        brief: 'This project omits the evidence rubric.',
        requirements: ['Requirement 1'],
        acceptanceCriteria: ['Acceptance 1'],
        deliverables: [
          { type: 'repository', title: 'Repo', artifactId: 'repo_1' }
        ]
      }
    ],
    microTasks: [
      {
        id: 'task-1',
        projectId: 'proj_missing_rubric',
        title: 'Task one',
        type: 'project',
        estimatedMinutes: 30,
        instructions: 'Do the first thing.',
        acceptanceTest: { type: 'checklist', spec: ['Check 1'] }
      },
      {
        id: 'task-2',
        projectId: 'proj_missing_rubric',
        title: 'Task two',
        type: 'project',
        estimatedMinutes: 30,
        instructions: 'Do the second thing.',
        acceptanceTest: { type: 'checklist', spec: ['Check 2'] }
      },
      {
        id: 'task-3',
        projectId: 'proj_missing_rubric',
        title: 'Task three',
        type: 'project',
        estimatedMinutes: 30,
        instructions: 'Do the third thing.',
        acceptanceTest: { type: 'checklist', spec: ['Check 3'] }
      }
    ],
    adaptationNotes: 'No notes.'
  };

  const sanitized = plannerServiceTestables.ensureProjectEvidenceRubrics(rawPlan) as typeof rawPlan;

  assert.notStrictEqual(sanitized, rawPlan, 'sanitizer should clone the incoming plan');
  assert.strictEqual(
    rawPlan.projects[0].evidenceRubric,
    undefined,
    'original payload should remain without a rubric'
  );

  const parsed = plannerServiceTestables.sprintPlanCoreSchema.safeParse(sanitized);
  assert.ok(parsed.success, parsed.success ? undefined : JSON.stringify(parsed.error.issues, null, 2));

  assert.deepStrictEqual(
    sanitized.projects[0].evidenceRubric,
    plannerServiceTestables.defaultEvidenceRubric,
    'sanitized plan should include the default evidence rubric'
  );

  assert.strictEqual(
    sanitized.projects[0].title,
    rawPlan.projects[0].title,
    'other project fields should be preserved'
  );
});
