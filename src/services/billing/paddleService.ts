import { ensurePaddleConfigured, paddleConfig } from '../../config/paddle';
import { AppError } from '../../errors/AppError';

type FetchFn = (input: string | URL, init?: any) => Promise<any>;

let cachedFetch: FetchFn | null = null;

async function getFetch(): Promise<FetchFn> {
  if (cachedFetch) {
    return cachedFetch;
  }

  if (typeof globalThis.fetch === 'function') {
    cachedFetch = globalThis.fetch.bind(globalThis) as FetchFn;
    return cachedFetch;
  }

  const { default: nodeFetch } = await import('node-fetch');
  cachedFetch = nodeFetch as FetchFn;
  return cachedFetch;
}

interface PaddleRequestOptions {
  method?: string;
  body?: unknown;
}

interface CreateCustomerInput {
  customerId?: string | null;
  email: string;
  name?: string;
}

interface CreateCheckoutSessionInput {
  priceId: string;
  customerId: string;
  allowPriceOverride?: boolean;
  overridePrice?: number;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, unknown>;
}

interface PaddleCheckoutSession {
  id: string;
  url: string;
  expiresAt?: string;
}

interface UpdateSubscriptionInput {
  paddleSubscriptionId: string;
  priceId?: string;
  pause?: boolean;
  resume?: boolean;
}

interface CancelSubscriptionInput {
  paddleSubscriptionId: string;
  effectiveFrom?: 'immediately' | 'next_billing_period';
}

class PaddleService {
  private async request<T>(path: string, options: PaddleRequestOptions = {}): Promise<T> {
    ensurePaddleConfigured();

    const url = new URL(path, paddleConfig.apiUrl).toString();
    const fetchFn = await getFetch();
    const response = await fetchFn(url, {
      method: options.method ?? 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${paddleConfig.apiKey}`,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new AppError(`Paddle API request failed (${response.status}): ${text}`, 502);
    }

    if (response.status === 204) {
      return undefined as unknown as T;
    }

    const data = (await response.json()) as T;
    return data;
  }

  async createOrRetrieveCustomer(input: CreateCustomerInput): Promise<string> {
    ensurePaddleConfigured();

    if (input.customerId) {
      return input.customerId;
    }

    const payload = {
      data: {
        attributes: {
          email: input.email,
          name: input.name,
        },
      },
    };

    const response = await this.request<{ data: { id: string } }>('/v1/customers', {
      method: 'POST',
      body: payload,
    });

    return response.data.id;
  }

  async createCheckoutSession(
    input: CreateCheckoutSessionInput,
  ): Promise<PaddleCheckoutSession> {
    ensurePaddleConfigured();

    const priceOverrides = input.allowPriceOverride && input.overridePrice !== undefined
      ? [{
          price_id: input.priceId,
          amount: {
            currency_code: 'USD',
            amount: Math.max(input.overridePrice, 0),
          },
        }]
      : undefined;

    const payload = {
      data: {
        attributes: {
          customer_id: input.customerId,
          prices: [
            {
              price_id: input.priceId,
            },
          ],
          price_overrides: priceOverrides,
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
          metadata: input.metadata,
        },
      },
    };

    const response = await this.request<{ data: { id: string; attributes: { checkout_url: string; expires_at?: string } } }>(
      '/v1/checkout-sessions',
      {
        method: 'POST',
        body: payload,
      },
    );

    return {
      id: response.data.id,
      url: response.data.attributes.checkout_url,
      expiresAt: response.data.attributes.expires_at,
    };
  }

  async updateSubscription(input: UpdateSubscriptionInput) {
    ensurePaddleConfigured();

    const payload: Record<string, unknown> = {};

    if (input.priceId) {
      payload.items = [
        {
          price_id: input.priceId,
        },
      ];
    }

    if (input.pause) {
      payload.recurring_action = {
        action: 'pause',
      };
    }

    if (input.resume) {
      payload.recurring_action = {
        action: 'resume',
      };
    }

    await this.request(`/v1/subscriptions/${input.paddleSubscriptionId}`, {
      method: 'PATCH',
      body: payload,
    });
  }

  async cancelSubscription(input: CancelSubscriptionInput) {
    ensurePaddleConfigured();

    const payload = {
      data: {
        attributes: {
          cancellation_effective_date: input.effectiveFrom === 'immediately' ? 'immediately' : 'next_billing_period',
        },
      },
    };

    await this.request(`/v1/subscriptions/${input.paddleSubscriptionId}`, {
      method: 'DELETE',
      body: payload,
    });
  }
}

export const paddleService = new PaddleService();
