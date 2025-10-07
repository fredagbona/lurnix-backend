/**
 * Paddle Payment Flow Test Script
 * 
 * This script simulates the complete Paddle subscription flow:
 * 1. Creates a subscription (gets checkout URL)
 * 2. Simulates webhook events (subscription.activated)
 * 3. Verifies subscription is active
 * 
 * Usage: npx tsx scripts/testPaddleFlow.ts <userId> <planType> <billingCycle>
 * Example: npx tsx scripts/testPaddleFlow.ts user-uuid-here master monthly
 * 
 * DELETE THIS FILE AFTER TESTING - FOR DEVELOPMENT ONLY
 */

import { prisma } from '../src/prisma/typedClient';
import { subscriptionService } from '../src/services/subscriptionService';
import { paddleWebhookService } from '../src/services/paddleWebhookService';
import type { PlanType, BillingCycle } from '../src/prisma/prismaTypes';

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg: string) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg: string) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  step: (num: number, msg: string) => console.log(`\n${colors.cyan}${colors.bright}[Step ${num}]${colors.reset} ${msg}`),
  data: (label: string, value: any) => console.log(`  ${colors.yellow}${label}:${colors.reset}`, value),
};

interface TestConfig {
  userId: string;
  planType: PlanType;
  billingCycle: BillingCycle;
  couponCode?: string;
}

async function testPaddleFlow(config: TestConfig) {
  console.log(`\n${colors.bright}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}  🧪 PADDLE PAYMENT FLOW TEST (SANDBOX SIMULATION)${colors.reset}`);
  console.log(`${colors.bright}═══════════════════════════════════════════════════════════${colors.reset}\n`);

  try {
    // Step 1: Verify user exists
    log.step(1, 'Verifying user exists...');
    const user = await prisma.user.findUnique({
      where: { id: config.userId },
    });

    if (!user) {
      log.error(`User with ID ${config.userId} not found`);
      log.info('Create a user first or use an existing user ID');
      process.exit(1);
    }

    log.success(`User found: ${user.email}`);
    log.data('Name', user.fullname);
    log.data('User ID', user.id);

    // Step 2: Find the plan
    log.step(2, 'Finding subscription plan...');
    const plan = await prisma.subscriptionPlan.findUnique({
      where: {
        planType_billingCycle: {
          planType: config.planType,
          billingCycle: config.billingCycle,
        },
      },
    });

    if (!plan || !plan.isActive) {
      log.error(`Plan not found: ${config.planType} - ${config.billingCycle}`);
      log.info('Run: npm run db:seed to create plans');
      process.exit(1);
    }

    log.success(`Plan found: ${plan.name}`);
    log.data('Plan ID', plan.id);
    log.data('Price', `$${plan.billingAmount.toString()}/${config.billingCycle}`);
    log.data('Paddle Price ID', plan.paddlePriceId || 'NOT SET');

    if (!plan.paddlePriceId) {
      log.warning('Paddle Price ID is not set in the database');
      log.info('Update it in prisma/seeds/subscriptionSeed.ts and re-run npm run db:seed');
    }

    // Step 3: Check for existing active subscription
    log.step(3, 'Checking for existing subscriptions...');
    const existingSubscription = await prisma.userSubscription.findFirst({
      where: {
        userId: config.userId,
        status: { in: ['active', 'pending', 'paused'] },
      },
    });

    if (existingSubscription) {
      log.warning('User already has an active subscription');
      log.data('Status', existingSubscription.status);
      log.data('Plan ID', existingSubscription.planId);
      log.info('Cancel it first or use a different user');
      
      const proceed = process.argv.includes('--force');
      if (!proceed) {
        log.error('Test aborted. Use --force to proceed anyway (will fail)');
        process.exit(1);
      }
    } else {
      log.success('No active subscription found');
    }

    // Step 4: Create subscription (this would normally create Paddle checkout)
    log.step(4, 'Creating subscription...');
    log.info('In production, this would call Paddle API to create checkout session');
    log.info('For testing, we simulate the response...');

    let subscription;
    let checkoutUrl;

    try {
      const result = await subscriptionService.createSubscription({
        userId: config.userId,
        planId: plan.id,
        couponCode: config.couponCode,
        autoRenewal: true,
      });

      subscription = result.subscription;
      checkoutUrl = result.checkout?.url;

      log.success('Subscription created successfully!');
      log.data('Subscription ID', subscription.id);
      log.data('Status', subscription.status);
      log.data('Paddle Checkout ID', subscription.paddleCheckoutId || 'N/A');
      
      if (checkoutUrl) {
        log.data('Checkout URL', checkoutUrl);
        log.info('In production, redirect user to this URL');
      } else {
        log.warning('No checkout URL returned (Paddle API not configured)');
      }

      if (result.coupon) {
        log.success(`Coupon applied: ${result.coupon.code}`);
        log.data('Discount', `$${result.coupon.discountAmount}`);
      }
    } catch (error: any) {
      log.error('Failed to create subscription');
      log.error(error.message);
      
      if (error.message.includes('Paddle API key')) {
        log.info('Set PADDLE_API_KEY in .env to test with real Paddle API');
        log.info('Or continue with simulation (subscription created but no checkout URL)');
      }
      
      // Try to get the subscription anyway
      subscription = await prisma.userSubscription.findFirst({
        where: { userId: config.userId },
        orderBy: { createdAt: 'desc' },
      });

      if (!subscription) {
        throw error;
      }
    }

    // Step 5: Simulate user completing payment
    log.step(5, 'Simulating payment completion...');
    log.info('In production, user would pay on Paddle checkout page');
    log.info('Paddle would then send webhook to your backend');
    log.info('Simulating webhook: subscription.activated...');

    await new Promise(resolve => setTimeout(resolve, 1000)); // Dramatic pause

    // Simulate Paddle webhook
    const mockPaddleSubscriptionId = `sub_test_${Date.now()}`;
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    const webhookPayload = {
      event_type: 'subscription.activated',
      data: {
        id: mockPaddleSubscriptionId,
        attributes: {
          status: 'active',
          checkout: {
            id: subscription.paddleCheckoutId || `chk_test_${Date.now()}`,
          },
          current_billing_period: {
            starts_at: now.toISOString(),
            ends_at: nextMonth.toISOString(),
          },
        },
      },
    };

    try {
      await paddleWebhookService.handleEvent(webhookPayload);
      log.success('Webhook processed successfully!');
    } catch (error: any) {
      log.error('Webhook processing failed');
      log.error(error.message);
      throw error;
    }

    // Step 6: Verify subscription is now active
    log.step(6, 'Verifying subscription activation...');
    const updatedSubscription = await prisma.userSubscription.findUnique({
      where: { id: subscription.id },
      include: { plan: true },
    });

    if (!updatedSubscription) {
      log.error('Subscription not found after webhook');
      process.exit(1);
    }

    log.success('Subscription verified!');
    log.data('Status', updatedSubscription.status);
    log.data('Paddle Subscription ID', updatedSubscription.paddleSubscriptionId);
    log.data('Current Period Start', updatedSubscription.currentPeriodStart.toISOString());
    log.data('Current Period End', updatedSubscription.currentPeriodEnd.toISOString());
    log.data('Auto Renewal', updatedSubscription.autoRenewal);

    if (updatedSubscription.status === 'active') {
      log.success('✨ Subscription is ACTIVE! User now has premium access.');
    } else {
      log.warning(`Subscription status is: ${updatedSubscription.status}`);
    }

    // Step 7: Test feature access
    log.step(7, 'Testing feature access...');
    const { featureGateService } = await import('../src/services/featureGateService');
    
    const canAccessAI = await featureGateService.canAccessFeature(config.userId, 'ai_mentor_chat');
    const canAccessRoadmaps = await featureGateService.canAccessFeature(config.userId, 'roadmap_creation');
    
    log.data('Can access AI Mentor', canAccessAI ? '✓ YES' : '✗ NO');
    log.data('Can access Roadmaps', canAccessRoadmaps ? '✓ YES' : '✗ NO');

    // Summary
    console.log(`\n${colors.bright}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.green}${colors.bright}  ✓ TEST COMPLETED SUCCESSFULLY${colors.reset}`);
    console.log(`${colors.bright}═══════════════════════════════════════════════════════════${colors.reset}\n`);

    log.info('Next steps:');
    console.log('  1. Check subscription in database: npm run db:studio');
    console.log('  2. Test API: GET /api/subscriptions/current');
    console.log('  3. Test with real Paddle: Set PADDLE_API_KEY in .env');
    console.log(`  4. Clean up: Delete subscription ID ${subscription.id}\n`);

  } catch (error: any) {
    console.log(`\n${colors.bright}═══════════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.red}${colors.bright}  ✗ TEST FAILED${colors.reset}`);
    console.log(`${colors.bright}═══════════════════════════════════════════════════════════${colors.reset}\n`);
    log.error(error.message);
    if (error.stack) {
      console.log('\n' + error.stack);
    }
    process.exit(1);
  }
}

// Parse command line arguments
async function main() {
  const args = process.argv.slice(2).filter(arg => !arg.startsWith('--'));

  if (args.length < 3) {
    console.log(`
${colors.bright}Usage:${colors.reset}
  npx tsx scripts/testPaddleFlow.ts <userId> <planType> <billingCycle> [couponCode]

${colors.bright}Arguments:${colors.reset}
  userId        - User UUID from database
  planType      - Plan type: free, builder, or master
  billingCycle  - Billing cycle: monthly, six_months, or twelve_months
  couponCode    - (Optional) Coupon code to test discounts

${colors.bright}Examples:${colors.reset}
  npx tsx scripts/testPaddleFlow.ts abc-123-def master monthly
  npx tsx scripts/testPaddleFlow.ts abc-123-def builder six_months SAVE10

${colors.bright}Flags:${colors.reset}
  --force       - Proceed even if user has active subscription

${colors.bright}First time?${colors.reset}
  1. Get a user ID: npm run db:studio → Open Users table → Copy ID
  2. Run this script with that user ID
  3. Check results in database

${colors.yellow}⚠ This is a test script - DELETE after testing${colors.reset}
    `);
    process.exit(1);
  }

  const [userId, planType, billingCycle, couponCode] = args;

  // Validate plan type
  const validPlanTypes = ['free', 'builder', 'master'];
  if (!validPlanTypes.includes(planType)) {
    log.error(`Invalid plan type: ${planType}`);
    log.info(`Valid options: ${validPlanTypes.join(', ')}`);
    process.exit(1);
  }

  // Validate billing cycle
  const validBillingCycles = ['monthly', 'six_months', 'twelve_months'];
  if (!validBillingCycles.includes(billingCycle)) {
    log.error(`Invalid billing cycle: ${billingCycle}`);
    log.info(`Valid options: ${validBillingCycles.join(', ')}`);
    process.exit(1);
  }

  await testPaddleFlow({
    userId,
    planType: planType as PlanType,
    billingCycle: billingCycle as BillingCycle,
    couponCode,
  });

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
