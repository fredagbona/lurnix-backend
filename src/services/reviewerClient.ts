import Groq from 'groq-sdk';
import { config } from '../config/environment.js';
import { ReviewInput } from '../types/reviewer.js';

const SYSTEM_PROMPT = `You are **Lurnix Reviewer**, an objective evaluator of learning evidence.
Your job: assess whether the sprint's **deliverables** meet the rubric and acceptance criteria,
produce a numeric score (0..1), list achieved vs missing items, and propose **next recommendations**.

### Rules
1) **Evidence-first**: prioritize objective signals (tests passing, live demo reachable, repo structure) over self-report.
2) **Rubric-driven**: use the provided weights to compute a score; do not invent dimensions.
3) **Honest but motivating**: short, specific recommendations; prefer micro-remediation.
4) **Safety**: never request private credentials; do not execute untrusted code.
5) **Output format**: return STRICT JSON matching the schema. No extra text.

### Inputs you will receive
- \`project\`: requirements, acceptanceCriteria, evidenceRubric.
- \`artifacts\`: list of submitted artifacts (repo, deployment, video, screenshot) + quick checks computed by the system.
- \`selfEvaluation\` (optional): learner's confidence 1–10 + reflection.

### Scoring guidance
- Compute dimension sub-scores from observable signals. If a signal is missing, score that part conservatively.
- \`score\` is the weighted sum of dimensions; \`pass\` iff \`score >= passThreshold\`.
- If the demo URL is unreachable or tests fail, reflect that in **Fonctionnalité**.

Return JSON strictly matching \`ReviewOutput\`.`;

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
  const provider = config.REVIEWER_PROVIDER;

  if (provider === 'groq') {
    return {
      provider,
      model: config.REVIEWER_GROQ_MODEL,
      apiKey: config.GROQ_API_KEY
    };
  }

  return {
    provider: 'lmstudio',
    model: config.REVIEWER_LMSTUDIO_MODEL,
    baseUrl: `${config.LMSTUDIO_BASE_URL.replace(/\/$/, '')}/v1/chat/completions`
  };
}

function getGroqClient(apiKey: string): any {
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is required when REVIEWER_PROVIDER is set to groq');
  }

  if (!groqClient) {
    groqClient = new Groq({ apiKey });
  }

  return groqClient;
}

export async function requestReviewAssessment(payload: ReviewInput): Promise<unknown> {
  const providerConfig = buildProviderConfig();
  const { systemMessage, userPrompt } = buildPrompt(payload);

  if (providerConfig.provider === 'groq') {
    const client = getGroqClient(providerConfig.apiKey);
    const completion = await client.chat.completions.create({
      model: providerConfig.model,
      temperature: 0.2,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: userPrompt }
      ]
    });

    const content = completion?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      throw new Error('Groq reviewer returned empty content');
    }

    return parseReviewContent(content);
  }

  const body = buildLmStudioRequest(providerConfig.model, systemMessage, userPrompt);
  const response = await fetch(providerConfig.baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Reviewer provider error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error('LM Studio reviewer returned empty content');
  }

  return parseReviewContent(content);
}

function buildPrompt(payload: ReviewInput) {
  const projectJson = JSON.stringify(payload.project ?? {}, null, 2);
  const artifactsJson = JSON.stringify(payload.artifacts ?? [], null, 2);
  const selfEvalJson = JSON.stringify(payload.selfEvaluation ?? null, null, 2);

  const userPrompt = [
    'Project context:',
    projectJson,
    '',
    'Artifacts submitted:',
    artifactsJson,
    '',
    'Learner self-evaluation:',
    selfEvalJson,
    '',
    'Return ONLY valid JSON with no commentary. Output must match ReviewOutput { score (0..1), achieved[], missing[], nextRecommendations[], pass }. Schema checks are enforced by response_format when available.'
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
    max_tokens: 1024,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userPrompt }
    ]
  };
}

function parseReviewContent(rawContent: string) {
  const sanitized = stripCodeFence(rawContent.trim());

  try {
    return JSON.parse(sanitized);
  } catch (error) {
    throw new Error(`Failed to parse reviewer response JSON: ${(error as Error).message}`);
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
