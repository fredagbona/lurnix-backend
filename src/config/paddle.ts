import { z } from 'zod';

const paddleEnvSchema = z.object({
  apiUrl: z.string().url().default('https://api.paddle.com'),
  apiKey: z.string().optional(),
  environment: z.enum(['sandbox', 'production']).default('sandbox'),
  webhookSecret: z.string().optional(),
});

const parsed = paddleEnvSchema.parse({
  apiUrl: process.env.PADDLE_API_URL,
  apiKey: process.env.PADDLE_API_KEY,
  environment: process.env.PADDLE_ENV?.toLowerCase() === 'production' ? 'production' : 'sandbox',
  webhookSecret: process.env.PADDLE_WEBHOOK_SECRET,
});

export const paddleConfig = {
  apiUrl: parsed.apiUrl,
  apiKey: parsed.apiKey,
  environment: parsed.environment,
  webhookSecret: parsed.webhookSecret,
};

export function ensurePaddleConfigured() {
  if (!paddleConfig.apiKey) {
    throw new Error('Paddle API key is not configured. Set PADDLE_API_KEY.');
  }
}
