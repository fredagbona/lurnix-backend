import { randomUUID } from 'crypto';
import { PlanType, BillingCycle, Prisma } from '@prisma/client';
import { db } from '../../src/prisma/prismaWrapper';

const decimal = (value: number) => new Prisma.Decimal(value);

type PlanTier = {
  billingCycle: BillingCycle;
  pricePerPeriod: number;
  billingAmount: number;
  commitmentMonths: number;
  discountPercentage?: number;
  paddlePriceId: string;
};

type PlanDefinition = {
  planType: PlanType;
  name: string;
  description: string;
  features: string[];
  limits: Record<string, unknown>;
  paddleProductId?: string;
  tiers: PlanTier[];
};

const PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    planType: PlanType.free,
    name: 'Free',
    description: 'Forever free plan to get started',
    features: [
      'Profile test → 7-day roadmap',
      'Limited access to resources',
      'Basic Discord community access',
      'Checkpoints & streaks tracking',
    ],
    limits: {
      roadmaps: 1,
      ai_interactions_per_month: 50,
      resource_access: 'limited',
    },
    tiers: [
      {
        billingCycle: BillingCycle.monthly,
        pricePerPeriod: 0,
        billingAmount: 0,
        commitmentMonths: 1,
        discountPercentage: 0,
        paddlePriceId: 'price_free_monthly',
      },
    ],
  },
  {
    planType: PlanType.builder,
    name: 'Builder',
    description: 'Complete learning toolkit with AI mentor',
    features: [
      'Multiple roadmaps (7/14/30 day options)',
      'Unlimited resource access',
      'AI Mentor (guidance + examples + feedback)',
      'Progress tracking (streaks, checkpoints, deliverables)',
      'All Free plan features',
    ],
    limits: {
      roadmaps: 'unlimited',
      ai_interactions_per_month: 'unlimited',
      resource_access: 'unlimited',
    },
    paddleProductId: 'prod_builder',
    tiers: [
      {
        billingCycle: BillingCycle.monthly,
        pricePerPeriod: 20,
        billingAmount: 20,
        commitmentMonths: 1,
        paddlePriceId: 'price_builder_monthly',
      },
      {
        billingCycle: BillingCycle.six_months,
        pricePerPeriod: 18,
        billingAmount: 108,
        commitmentMonths: 6,
        discountPercentage: 10,
        paddlePriceId: 'price_builder_6m',
      },
      {
        billingCycle: BillingCycle.twelve_months,
        pricePerPeriod: 16,
        billingAmount: 192,
        commitmentMonths: 12,
        discountPercentage: 20,
        paddlePriceId: 'price_builder_12m',
      },
    ],
  },
  {
    planType: PlanType.master,
    name: 'Master',
    description: 'Premium coaching with human mentorship',
    features: [
      'Weekly 1:1 coaching sessions (25-30 min)',
      'Personalized human feedback (code, projects, pitch)',
      'Career guidance (LinkedIn/GitHub profile, project storytelling)',
      'Networking opportunities & connections (when available)',
      'Priority support (faster response times)',
      'All Builder plan features',
    ],
    limits: {
      coaching_sessions_per_month: 4,
      priority_support: true,
    },
    paddleProductId: 'prod_master',
    tiers: [
      {
        billingCycle: BillingCycle.monthly,
        pricePerPeriod: 100,
        billingAmount: 100,
        commitmentMonths: 1,
        paddlePriceId: 'price_master_monthly',
      },
      {
        billingCycle: BillingCycle.six_months,
        pricePerPeriod: 90,
        billingAmount: 540,
        commitmentMonths: 6,
        discountPercentage: 10,
        paddlePriceId: 'price_master_6m',
      },
      {
        billingCycle: BillingCycle.twelve_months,
        pricePerPeriod: 80,
        billingAmount: 960,
        commitmentMonths: 12,
        discountPercentage: 20,
        paddlePriceId: 'price_master_12m',
      },
    ],
  },
];

export async function seedSubscriptionPlans() {
  console.log('🌱 Seeding subscription plans...');

  let createdCount = 0;

  for (const plan of PLAN_DEFINITIONS) {
    for (const tier of plan.tiers) {
      try {
        await db.subscriptionPlan.upsert({
          where: {
            planType_billingCycle: {
              planType: plan.planType,
              billingCycle: tier.billingCycle,
            },
          },
          update: {
            name: plan.name,
            description: plan.description,
            pricePerPeriod: decimal(tier.pricePerPeriod),
            billingAmount: decimal(tier.billingAmount),
            commitmentMonths: tier.commitmentMonths,
            discountPercentage: tier.discountPercentage ?? 0,
            features: plan.features,
            limits: plan.limits,
            paddleProductId: plan.paddleProductId,
            paddlePriceId: tier.paddlePriceId,
            isActive: true,
          },
          create: {
            id: randomUUID(),
            planType: plan.planType,
            billingCycle: tier.billingCycle,
            name: plan.name,
            description: plan.description,
            pricePerPeriod: decimal(tier.pricePerPeriod),
            billingAmount: decimal(tier.billingAmount),
            commitmentMonths: tier.commitmentMonths,
            discountPercentage: tier.discountPercentage ?? 0,
            features: plan.features,
            limits: plan.limits,
            paddleProductId: plan.paddleProductId,
            paddlePriceId: tier.paddlePriceId,
            isActive: true,
          },
        });

        createdCount += 1;
      } catch (error) {
        console.error(
          `Error creating/updating plan ${plan.planType} (${tier.billingCycle})`,
          error,
        );
      }
    }
  }

  console.log(`✅ Created/updated ${createdCount} subscription plan tiers`);
  return createdCount;
}

if (require.main === module) {
  seedSubscriptionPlans()
    .then((count) => {
      console.log(`Seeded ${count} subscription plan tiers successfully`);
      process.exit(0);
    })
    .catch((e) => {
      console.error('Error seeding subscription plans:', e);
      process.exit(1);
    });
}
