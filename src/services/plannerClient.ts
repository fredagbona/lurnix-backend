import Groq from 'groq-sdk';
import { createHash } from 'node:crypto';
import { config } from '../config/environment.js';
import { json } from 'node:stream/consumers';

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
  allowedResources?: string[] | null;
  context?: Record<string, unknown> | null;
  mode?: 'skeleton' | 'expansion';
  currentPlan?: Record<string, unknown> | null;
  expansionGoal?: { targetLengthDays?: number | null; additionalMicroTasks?: number | null } | null;
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

type SprintLength = 1 | 3 | 7 | 14;

interface SprintPlan {
  id: string;
  title: string;
  description: string;
  lengthDays: SprintLength;
  totalEstimatedHours: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  projects: Array<{
    id: string;
    title: string;
    brief: string;
    requirements: string[];
    acceptanceCriteria: string[];
    deliverables: Array<{
      type: "repository" | "deployment" | "video" | "screenshot";
      title: string;
      artifactId: string;
    }>;
    evidenceRubric: {
      dimensions: Array<{
        name: string;
        weight: number;
        levels?: string[];
      }>;
      passThreshold: number;
    };
    checkpoints?: Array<{
      id: string;
      title: string;
      type: "assessment" | "quiz" | "demo";
      spec: string;
    }>;
    support?: {
      concepts?: Array<{
        id: string;
        title: string;
        summary: string;
      }>;
      practiceKatas?: Array<{
        id: string;
        title: string;
        estimateMin: number;
      }>;
      allowedResources?: string[];
    };
    reflection?: {
      prompt: string;
      moodCheck?: boolean;
    };
  }>;
  microTasks: Array<{
    id: string;
    projectId: string;
    title: string;
    type: "concept" | "practice" | "project" | "assessment" | "reflection";
    estimatedMinutes: number;
    instructions: string;
    acceptanceTest: {
      type: "checklist" | "unit_tests" | "quiz" | "demo";
      spec: string | string[];
    };
    resources?: string[];
  }>;
  portfolioCards?: Array<{
    projectId: string;
    cover?: string;
    headline: string;
    badges?: string[];
    links?: {
      repo?: string;
      demo?: string;
      video?: string;
    };
  }>;
  adaptationNotes: string;
}

// Then, define the JSON Schema (for LM Studio)
const SkeletonSprintPlanJsonSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    description: { type: 'string' },
    lengthDays: {
      type: 'integer',
      enum: [1]
    },
    totalEstimatedHours: {
      type: 'number',
      minimum: 2,
      maximum: 12
    },
    difficulty: {
      type: 'string',
      enum: ['beginner', 'intermediate', 'advanced']
    },
    projects: {
      type: 'array',
      minItems: 1,
      maxItems: 1,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          brief: { type: 'string' },
          requirements: {
            type: 'array',
            minItems: 1,
            maxItems: 3,
            items: { type: 'string' }
          },
          acceptanceCriteria: {
            type: 'array',
            minItems: 1,
            maxItems: 3,
            items: { type: 'string' }
          },
          deliverables: {
            type: 'array',
            minItems: 1,
            maxItems: 1,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                type: {
                  type: 'string',
                  enum: ['repository', 'deployment', 'video', 'screenshot']
                },
                title: { type: 'string' },
                artifactId: { type: 'string' }
              },
              required: ['type', 'title', 'artifactId']
            }
          }
        },
        required: ['id', 'title', 'brief', 'requirements', 'acceptanceCriteria', 'deliverables']
      }
    },
    microTasks: {
      type: 'array',
      minItems: 3,
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string' },
          projectId: { type: 'string' },
          title: { type: 'string' },
          type: {
            type: 'string',
            enum: ['concept', 'practice', 'project', 'assessment', 'reflection']
          },
          estimatedMinutes: {
            type: 'number',
            minimum: 20,
            maximum: 90
          },
          instructions: { type: 'string' },
          acceptanceTest: {
            type: 'object',
            additionalProperties: false,
            properties: {
              type: {
                type: 'string',
                enum: ['checklist']
              },
              spec: {
                type: 'array',
                minItems: 2,
                maxItems: 4,
                items: { type: 'string' }
              }
            },
            required: ['type', 'spec']
          }
        },
        required: ['id', 'projectId', 'title', 'type', 'estimatedMinutes', 'instructions', 'acceptanceTest']
      }
    },
    adaptationNotes: { type: 'string' }
  },
  required: [
    'id',
    'title',
    'description',
    'lengthDays',
    'totalEstimatedHours',
    'difficulty',
    'projects',
    'microTasks',
    'adaptationNotes'
  ]
};

const SprintPlanJsonSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
    title: { type: "string" },
    description: { type: "string" },
    lengthDays: { 
      type: "number",
      enum: [1, 3, 7, 14]
    },
    totalEstimatedHours: { type: "number" },
    difficulty: { 
      type: "string",
      enum: ["beginner", "intermediate", "advanced"]
    },
    projects: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          brief: { type: "string" },
          requirements: {
            type: "array",
            items: { type: "string" }
          },
          acceptanceCriteria: {
            type: "array",
            items: { type: "string" }
          },
          deliverables: {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: { 
                  type: "string",
                  enum: ["repository", "deployment", "video", "screenshot"]
                },
                title: { type: "string" },
                artifactId: { type: "string" }
              },
              required: ["type", "title", "artifactId"]
            }
          },
          evidenceRubric: {
            type: "object",
            properties: {
              dimensions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    weight: { type: "number" },
                    levels: {
                      type: "array",
                      items: { type: "string" }
                    }
                  },
                  required: ["name", "weight"]
                }
              },
              passThreshold: { type: "number" }
            },
            required: ["dimensions", "passThreshold"]
          },
          checkpoints: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                title: { type: "string" },
                type: { 
                  type: "string",
                  enum: ["assessment", "quiz", "demo"]
                },
                spec: { type: "string" }
              },
              required: ["id", "title", "type", "spec"]
            }
          },
          support: {
            type: "object",
            properties: {
              concepts: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    title: { type: "string" },
                    summary: { type: "string" }
                  },
                  required: ["id", "title", "summary"]
                }
              },
              practiceKatas: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    title: { type: "string" },
                    estimateMin: { type: "number" }
                  },
                  required: ["id", "title", "estimateMin"]
                }
              },
              allowedResources: {
                type: "array",
                items: { type: "string" }
              }
            }
          },
          reflection: {
            type: "object",
            properties: {
              prompt: { type: "string" },
              moodCheck: { type: "boolean" }
            },
            required: ["prompt"]
          }
        },
        required: ["id", "title", "brief", "requirements", "acceptanceCriteria", "deliverables", "evidenceRubric"]
      }
    },
    microTasks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          projectId: { type: "string" },
          title: { type: "string" },
          type: { 
            type: "string",
            enum: ["concept", "practice", "project", "assessment", "reflection"]
          },
          estimatedMinutes: { type: "number" },
          instructions: { type: "string" },
          acceptanceTest: {
            type: "object",
            properties: {
              type: { 
                type: "string",
                enum: ["checklist", "unit_tests", "quiz", "demo"]
              },
              spec: {
                oneOf: [
                  { type: "string" },
                  { type: "array", items: { type: "string" } }
                ]
              }
            },
            required: ["type", "spec"]
          },
          resources: {
            type: "array",
            items: { type: "string" }
          }
        },
        required: ["id", "projectId", "title", "type", "estimatedMinutes", "instructions", "acceptanceTest"]
      }
    },
    portfolioCards: {
      type: "array",
      items: {
        type: "object",
        properties: {
          projectId: { type: "string" },
          cover: { type: "string" },
          headline: { type: "string" },
          badges: {
            type: "array",
            items: { type: "string" }
          },
          links: {
            type: "object",
            properties: {
              repo: { type: "string" },
              demo: { type: "string" },
              video: { type: "string" }
            }
          }
        },
        required: ["projectId", "headline"]
      }
    },
    adaptationNotes: { type: "string" }
  },
  required: ["id", "title", "description", "lengthDays", "totalEstimatedHours", "difficulty", "projects", "microTasks", "adaptationNotes"],
  additionalProperties: false
};

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

export type PlannerRequestErrorReason = 'provider_error' | 'client_timeout' | 'invalid_json';

export interface PlannerRequestTelemetry {
  provider: ProviderConfig['provider'];
  model: string;
  promptHash: string;
  latencyMs: number;
  timedOut?: boolean;
  timeoutMs?: number;
}

export class PlannerRequestError extends Error {
  readonly reason: PlannerRequestErrorReason;
  readonly telemetry: PlannerRequestTelemetry;

  constructor(params: {
    reason: PlannerRequestErrorReason;
    message: string;
    telemetry: PlannerRequestTelemetry;
    cause?: unknown;
  }) {
    super(params.message);
    this.name = 'PlannerRequestError';
    this.reason = params.reason;
    this.telemetry = params.telemetry;
    if (params.cause instanceof Error) {
      (this as unknown as { cause?: Error }).cause = params.cause;
    }
  }
}

export interface PlannerClientResult {
  plan: unknown;
  telemetry: PlannerRequestTelemetry;
  rawContent: string;
}

export async function requestPlannerPlan(payload: PlannerRequestPayload): Promise<PlannerClientResult> {
  const providerConfig = buildProviderConfig();
  const { systemMessage, userPrompt, responseSchema, responseSchemaName, maxTokens } = buildPrompt(payload);
  const promptHash = createHash('sha256').update(`${systemMessage}\n${userPrompt}`).digest('hex');
  const baseTelemetry: PlannerRequestTelemetry = {
    provider: providerConfig.provider,
    model: providerConfig.model,
    promptHash,
    latencyMs: 0
  };
  const startTime = Date.now();
  const requestTimeoutMs =
    providerConfig.provider === 'groq'
      ? config.PLANNER_REQUEST_TIMEOUT_MS
      : config.LMSTUDIO_TIMEOUT_MS;

  if (providerConfig.provider === 'groq') {
    const client = getGroqClient(providerConfig.apiKey);
    const signal = AbortSignal.timeout(requestTimeoutMs);
    try {
      const completion = await client.chat.completions.create({
        model: providerConfig.model,
        temperature: 0.2,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userPrompt }
        ],
        signal
      } as any);

      const content = completion?.choices?.[0]?.message?.content;
      if (!content || typeof content !== 'string') {
        throw new PlannerRequestError({
          reason: 'provider_error',
          message: 'Groq planner returned empty content',
          telemetry: {
            ...baseTelemetry,
            latencyMs: Date.now() - startTime
          }
        });
      }

      return parsePlannerContent(content, baseTelemetry, startTime);
    } catch (error) {
      if (error instanceof PlannerRequestError) {
        throw error;
      }

      if (isAbortError(error)) {
        throw new PlannerRequestError({
          reason: 'client_timeout',
          message: `Groq planner request exceeded client timeout of ${requestTimeoutMs}ms`,
          telemetry: {
            ...baseTelemetry,
            latencyMs: Date.now() - startTime,
            timedOut: true,
            timeoutMs: requestTimeoutMs
          },
          cause: error
        });
      }

      throw new PlannerRequestError({
        reason: 'provider_error',
        message: (error as Error)?.message ?? 'Groq planner request failed',
        telemetry: {
          ...baseTelemetry,
          latencyMs: Date.now() - startTime
        },
        cause: error
      });
    }
  }

  const body = buildLmStudioRequest(
    providerConfig.model,
    systemMessage,
    userPrompt,
    responseSchema,
    responseSchemaName,
    maxTokens
  );
  const lmStudioController = new AbortController();
  let timedOutByClient = false;
  const timeoutId = setTimeout(() => {
    timedOutByClient = true;
    lmStudioController.abort();
  }, requestTimeoutMs);

  try {
    const response = await fetch(providerConfig.baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: lmStudioController.signal
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new PlannerRequestError({
        reason: 'provider_error',
        message: `Planner provider error (${response.status}): ${errorText}`,
        telemetry: {
          ...baseTelemetry,
          latencyMs: Date.now() - startTime
        }
      });
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new PlannerRequestError({
        reason: 'provider_error',
        message: 'LM Studio planner returned empty content',
        telemetry: {
          ...baseTelemetry,
          latencyMs: Date.now() - startTime
        }
      });
    }

    return parsePlannerContent(content, baseTelemetry, startTime);
  } catch (error) {
    if (error instanceof PlannerRequestError) {
      throw error;
    }

    if (isAbortError(error) && timedOutByClient) {
      throw new PlannerRequestError({
        reason: 'client_timeout',
        message: `LM Studio planner request exceeded client timeout of ${requestTimeoutMs}ms`,
        telemetry: {
          ...baseTelemetry,
          latencyMs: Date.now() - startTime,
          timedOut: true,
          timeoutMs: requestTimeoutMs
        },
        cause: error
      });
    }

    if (isAbortError(error)) {
      throw new PlannerRequestError({
        reason: 'provider_error',
        message: 'LM Studio planner request was aborted before completion',
        telemetry: {
          ...baseTelemetry,
          latencyMs: Date.now() - startTime
        },
        cause: error
      });
    }

    throw new PlannerRequestError({
      reason: 'provider_error',
      message: (error as Error)?.message ?? 'LM Studio planner request failed',
      telemetry: {
        ...baseTelemetry,
        latencyMs: Date.now() - startTime
      },
      cause: error
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function isAbortError(error: unknown): boolean {
  if (!error) {
    return false;
  }

  const DomExceptionCtor = globalThis.DOMException;
  if (DomExceptionCtor && error instanceof DomExceptionCtor) {
    return error.name === 'AbortError' || error.name === 'TimeoutError';
  }

  if (error instanceof Error) {
    return error.name === 'AbortError' || error.name === 'TimeoutError';
  }

  return false;
}

interface PromptBuildResult {
  systemMessage: string;
  userPrompt: string;
  responseSchema: Record<string, unknown>;
  responseSchemaName: string;
  maxTokens: number;
}

function buildPrompt(payload: PlannerRequestPayload): PromptBuildResult {
  const mode = payload.mode ?? 'skeleton';
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

  const guidelines: string[] = [];
  if (mode === 'skeleton') {
    guidelines.push(
      'Skeleton contract: output a 1-day plan with one project, exactly three microTasks, and no optional extras such as support, checkpoints, reflections, or portfolio cards.'
    );
    guidelines.push(
      'Keep requirements and acceptance criteria to punchy bullets (<=3 each) and include exactly one deliverable for the project.'
    );
    guidelines.push(
      'Ensure each microTask estimate stays between 20-90 minutes, the instructions stay under three sentences, and the acceptanceTest is a checklist with 2-4 bullet points.'
    );
  } else {
    guidelines.push('Preserve all existing projects and microTasks from CURRENT_PLAN. Do not modify their IDs or instructions.');
    guidelines.push('Append new microTasks and adjust metadata to satisfy the expansion goal while reflecting cumulative progress.');
  }

  if (payload.allowedResources && payload.allowedResources.length) {
    guidelines.push('Limit references and resource suggestions to the ALLOWED_RESOURCES list when possible.');
  }

  if (payload.expansionGoal) {
    const goal = payload.expansionGoal;
    if (typeof goal.targetLengthDays === 'number') {
      guidelines.push(`Target total length: ${goal.targetLengthDays} day(s).`);
    }
    if (typeof goal.additionalMicroTasks === 'number') {
      guidelines.push(`Add approximately ${goal.additionalMicroTasks} new microTask(s).`);
    }
  }

  const promptSections: string[] = [
    `INCREMENTAL PLANNING MODE: ${mode.toUpperCase()}`,
    'GUIDELINES:',
    ...guidelines.map((line) => `- ${line}`),
    'OBJECTIVE CONTEXT:',
    JSON.stringify(objective, null, 2),
    '\nLEARNER PROFILE:',
    JSON.stringify(learnerProfile, null, 2),
    '\nADDITIONAL CONTEXT:',
    JSON.stringify(context, null, 2)
  ];

  if (payload.allowedResources && payload.allowedResources.length) {
    promptSections.push('\nALLOWED RESOURCES:');
    promptSections.push(JSON.stringify(payload.allowedResources, null, 2));
  }

  if (mode === 'expansion') {
    promptSections.push('\nCURRENT PLAN SNAPSHOT:');
    promptSections.push(JSON.stringify(payload.currentPlan ?? null, null, 2));
  }

  promptSections.push(`\nPREFERRED LENGTH: ${payload.preferLength ?? 'auto'}`);
  promptSections.push(
    '\nReturn ONLY valid JSON with no commentary. The SprintPlan schema is enforced via response_format.'
  );

  const userPrompt = promptSections.join('\n');

  const isSkeletonMode = mode === 'skeleton';
  const responseSchema = isSkeletonMode ? SkeletonSprintPlanJsonSchema : SprintPlanJsonSchema;
  const responseSchemaName = isSkeletonMode ? 'skeleton_sprint_plan' : 'sprint_plan';
  const maxTokens = isSkeletonMode ? 640 : 2048;

  return {
    systemMessage: SYSTEM_PROMPT,
    userPrompt,
    responseSchema,
    responseSchemaName,
    maxTokens
  };
}

function buildLmStudioRequest(
  model: string,
  systemMessage: string,
  userPrompt: string,
  responseSchema: Record<string, unknown>,
  responseSchemaName: string,
  maxTokens: number
) {
  const resolvedMaxTokens = Math.max(maxTokens, config.LMSTUDIO_MAX_TOKENS);

  return {
    model,
    temperature: 0.2,
    max_tokens: resolvedMaxTokens,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: responseSchemaName,
        strict: true,
        schema: responseSchema
      }
    },
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userPrompt }
    ]
  };
}

export const plannerClientTestables = {
  buildPrompt,
  buildLmStudioRequest
};

function parsePlannerContent(
  rawContent: string,
  baseTelemetry: PlannerRequestTelemetry,
  startTime: number
): PlannerClientResult {
  const sanitized = stripCodeFence(rawContent.trim());

  try {
    const parsed = JSON.parse(sanitized);
    return {
      plan: parsed,
      rawContent: sanitized,
      telemetry: {
        ...baseTelemetry,
        latencyMs: Date.now() - startTime
      }
    };
  } catch (error) {
    throw new PlannerRequestError({
      reason: 'invalid_json',
      message: `Failed to parse planner response JSON: ${(error as Error).message}`,
      telemetry: {
        ...baseTelemetry,
        latencyMs: Date.now() - startTime
      },
      cause: error
    });
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
