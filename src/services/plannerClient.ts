import Groq from 'groq-sdk';
import { config } from '../config/environment.js';

export interface PlannerRequestPayload {
  objective: {
    id: string;
    title: string;
    description?: string | null;
    successCriteria: string[];
    requiredSkills: string[];
    priority?: number | null;
    status?: string | null;
  };
  learnerProfile?: {
    id: string;
    hoursPerWeek?: number | null;
    strengths: string[];
    gaps: string[];
    passionTags: string[];
    blockers: string[];
    goals: string[];
  } | null;
  preferLength?: number;
  context?: Record<string, unknown> | null;
}

const SYSTEM_PROMPT = `You are Lurnix Planner, an expert at generating short, portfolio-first learning sprints.
Given learner profile context, an objective, and optional preferred length, produce a JSON sprint plan that strictly matches the provided schema.
Rules:
1. Portfolio-first: include at least one project with deliverables & evidence rubric.
2. Keep microTasks 30-90 minutes and end with acceptance checks.
3. Respect learner hours, strengths, gaps.
4. Use the context payload (profile quiz summary, streak, completed tasks) to adapt deliverables and pacing.
5. Output MUST be valid JSON and match the SprintPlan schema exactly.
`;

const SCHEMA_PROMPT = `JSON Schema (SprintPlan):
{
  "id": string,
  "title": string,
  "description": string,
  "lengthDays": 3 | 7 | 14,
  "totalEstimatedHours": number,
  "difficulty": "beginner" | "intermediate" | "advanced",
  "projects": [
    {
      "id": string,
      "title": string,
      "brief": string,
      "requirements": string[],
      "acceptanceCriteria": string[],
      "deliverables": [
        {
          "type": "repository" | "deployment" | "video" | "screenshot",
          "title": string,
          "artifactId": string
        }
      ],
      "evidenceRubric": {
        "dimensions": [ { "name": string, "weight": number, "levels"?: string[] } ],
        "passThreshold": number
      },
      "checkpoints"?: [ { "id": string, "title": string, "type": "assessment" | "quiz" | "demo", "spec": string } ],
      "support"?: {
        "concepts"?: [ { "id": string, "title": string, "summary": string } ],
        "practiceKatas"?: [ { "id": string, "title": string, "estimateMin": number } ],
        "allowedResources"?: string[]
      },
      "reflection"?: { "prompt": string, "moodCheck"?: boolean }
    }
  ],
  "microTasks": [
    {
      "id": string,
      "projectId": string,
      "title": string,
      "type": "concept" | "practice" | "project" | "assessment" | "reflection",
      "estimatedMinutes": number,
      "instructions": string,
      "acceptanceTest": { "type": "checklist" | "unit_tests" | "quiz" | "demo", "spec": string | string[] },
      "resources"?: string[]
    }
  ],
  "portfolioCards"?: [
    {
      "projectId": string,
      "cover"?: string,
      "headline": string,
      "badges"?: string[],
      "links"?: { "repo"?: string, "demo"?: string, "video"?: string }
    }
  ],
  "adaptationNotes": string
}`;

type ProviderConfig =
  | {
      provider: 'groq';
      model: string;
      apiKey: string;
    }
  | {
      provider: 'lmstudio';
      model: string;
      baseUrl: string;
    };

let groqClient: any = null;

function buildProviderConfig(): ProviderConfig {
  const provider = config.PLANNER_PROVIDER;

  if (provider === 'groq') {
    return {
      provider,
      model: config.GROQ_MODEL,
      apiKey: config.GROQ_API_KEY
    };
  }

  return {
    provider: 'lmstudio',
    model: config.LMSTUDIO_MODEL,
    baseUrl: `${config.LMSTUDIO_BASE_URL.replace(/\/$/, '')}/v1/chat/completions`
  };
}

function getGroqClient(apiKey: string): any {
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is required when PLANNER_PROVIDER is set to groq');
  }

  if (!groqClient) {
    groqClient = new Groq({ apiKey });
  }

  return groqClient;
}

export async function requestPlannerPlan(payload: PlannerRequestPayload): Promise<unknown> {
  const providerConfig = buildProviderConfig();
  const { systemMessage, userPrompt } = buildPrompt(payload);

  if (providerConfig.provider === 'groq') {
    const client = getGroqClient(providerConfig.apiKey);
    const completion = await client.chat.completions.create({
      model: providerConfig.model,
      temperature: 0.2,
      max_tokens: 2048,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userPrompt }
      ]
    });

    const content = completion?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new Error('Groq planner returned empty content');
    }

    return parsePlannerContent(content);
  }

  const body = buildLmStudioRequest(providerConfig.model, systemMessage, userPrompt);
  const response = await fetch(providerConfig.baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Planner provider error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error('LM Studio planner returned empty content');
  }

  return parsePlannerContent(content);
}

function buildPrompt(payload: PlannerRequestPayload) {
  const objective = {
    id: payload.objective.id,
    title: payload.objective.title,
    description: payload.objective.description ?? null,
    successCriteria: payload.objective.successCriteria ?? [],
    requiredSkills: payload.objective.requiredSkills ?? [],
    priority: payload.objective.priority ?? null,
    status: payload.objective.status ?? null
  };

  const learnerProfile = payload.learnerProfile
    ? {
        id: payload.learnerProfile.id,
        hoursPerWeek: payload.learnerProfile.hoursPerWeek ?? null,
        strengths: payload.learnerProfile.strengths ?? [],
        gaps: payload.learnerProfile.gaps ?? [],
        passionTags: payload.learnerProfile.passionTags ?? [],
        blockers: payload.learnerProfile.blockers ?? [],
        goals: payload.learnerProfile.goals ?? []
      }
    : null;

  const context = payload.context ? JSON.parse(JSON.stringify(payload.context)) : null;

  const userPrompt = [
    'OBJECTIVE CONTEXT:',
    JSON.stringify(objective, null, 2),
    '\nLEARNER PROFILE:',
    JSON.stringify(learnerProfile, null, 2),
    '\nADDITIONAL CONTEXT:',
    JSON.stringify(context, null, 2),
    `\nPREFERRED LENGTH: ${payload.preferLength ?? 'auto'}`,
    '\nReturn ONLY valid JSON with no commentary. Schema is defined below.',
    SCHEMA_PROMPT
  ].join('\n');

  return {
    systemMessage: SYSTEM_PROMPT,
    userPrompt
  };
}

function buildLmStudioRequest(model: string, systemMessage: string, userPrompt: string) {
  return {
    model,
    temperature: 0.2,
    max_tokens: 2048,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userPrompt }
    ]
  };
}

function parsePlannerContent(rawContent: string) {
  const sanitized = stripCodeFence(rawContent.trim());

  try {
    return JSON.parse(sanitized);
  } catch (error) {
    throw new Error(`Failed to parse planner response JSON: ${(error as Error).message}`);
  }
}

function stripCodeFence(content: string) {
  if (content.startsWith('```')) {
    const end = content.lastIndexOf('```');
    if (end > 0) {
      return content.slice(content.indexOf('\n') + 1, end).trim();
    }
  }
  return content;
}
