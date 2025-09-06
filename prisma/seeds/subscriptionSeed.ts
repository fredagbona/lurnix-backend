import { randomUUID } from 'crypto';
import { db } from '../../src/prisma/prismaWrapper';

/**
 * Seed subscription plans with region-based pricing
 */
export async function seedSubscriptionPlans() {
  console.log('🌱 Seeding subscription plans...');

  try {
    // Define regions with their currencies
    const regions = [
      { code: 'US', currency: 'USD', multiplier: 1.0 },
      { code: 'GB', currency: 'GBP', multiplier: 0.8 },
      { code: 'EU', currency: 'EUR', multiplier: 0.9 },
      { code: 'CA', currency: 'CAD', multiplier: 1.3 },
      { code: 'AU', currency: 'AUD', multiplier: 1.5 },
      { code: 'IN', currency: 'INR', multiplier: 83 },
      { code: 'NG', currency: 'NGN', multiplier: 1500 },
      { code: 'ZA', currency: 'ZAR', multiplier: 18 },
      { code: 'KE', currency: 'KES', multiplier: 130 },
      { code: 'GH', currency: 'GHS', multiplier: 13 },
    ];

    // Define base plans (in USD)
    const basePlans = [
      {
        code: 'basic-monthly',
        name: 'Basic Plan (Monthly)',
        description: 'Access to essential learning resources',
        basePrice: 9.99,
        interval: 'monthly' as const,
        features: [
          'Access to all basic courses',
          'Learning path recommendations',
          'Basic quiz assessments',
          'Community forum access',
        ],
      },
      {
        code: 'basic-yearly',
        name: 'Basic Plan (Yearly)',
        description: 'Access to essential learning resources with yearly discount',
        basePrice: 99.99,
        interval: 'yearly' as const,
        features: [
          'Access to all basic courses',
          'Learning path recommendations',
          'Basic quiz assessments',
          'Community forum access',
          '16% discount compared to monthly plan',
        ],
      },
      {
        code: 'pro-monthly',
        name: 'Professional Plan (Monthly)',
        description: 'Advanced learning tools for serious learners',
        basePrice: 19.99,
        interval: 'monthly' as const,
        features: [
          'All Basic plan features',
          'Access to advanced courses',
          'Personalized learning roadmaps',
          'Advanced quiz assessments',
          'Priority community support',
          'Monthly live Q&A sessions',
        ],
      },
      {
        code: 'pro-yearly',
        name: 'Professional Plan (Yearly)',
        description: 'Advanced learning tools for serious learners with yearly discount',
        basePrice: 199.99,
        interval: 'yearly' as const,
        features: [
          'All Basic plan features',
          'Access to advanced courses',
          'Personalized learning roadmaps',
          'Advanced quiz assessments',
          'Priority community support',
          'Monthly live Q&A sessions',
          '16% discount compared to monthly plan',
        ],
      },
      {
        code: 'premium-monthly',
        name: 'Premium Plan (Monthly)',
        description: 'Complete learning experience with all features',
        basePrice: 29.99,
        interval: 'monthly' as const,
        features: [
          'All Professional plan features',
          'One-on-one mentoring sessions',
          'Exclusive premium courses',
          'Certificate of completion',
          'Career guidance sessions',
          'Job placement assistance',
          'Weekly live workshops',
        ],
      },
      {
        code: 'premium-yearly',
        name: 'Premium Plan (Yearly)',
        description: 'Complete learning experience with all features and yearly discount',
        basePrice: 299.99,
        interval: 'yearly' as const,
        features: [
          'All Professional plan features',
          'One-on-one mentoring sessions',
          'Exclusive premium courses',
          'Certificate of completion',
          'Career guidance sessions',
          'Job placement assistance',
          'Weekly live workshops',
          '16% discount compared to monthly plan',
        ],
      },
    ];

    // Create subscription plans for each region
    let createdCount = 0;
    
    for (const region of regions) {
      for (const plan of basePlans) {
        // Calculate price based on region multiplier
        const price = Math.round((plan.basePrice * region.multiplier) * 100) / 100;
        const planCode = `${plan.code}-${region.code.toLowerCase()}`;
        
        try {
          // Check if plan exists
          const existingPlan = await db.subscriptionPlan.findUnique({
            where: { code: planCode },
          });
          
          if (existingPlan) {
            // Update existing plan
            await db.subscriptionPlan.update({
              where: { code: planCode },
              data: {
                name: plan.name,
                description: plan.description,
                price,
                currency: region.currency,
                regionCode: region.code,
                interval: plan.interval,
                features: plan.features,
                isActive: true,
              },
            });
          } else {
            // Create new plan
            await db.subscriptionPlan.create({
              data: {
                id: randomUUID(),
                code: planCode,
                name: plan.name,
                description: plan.description,
                price,
                currency: region.currency,
                regionCode: region.code,
                interval: plan.interval,
                features: plan.features,
                isActive: true,
              },
            });
            createdCount++;
          }
        } catch (error) {
          console.error(`Error creating/updating plan ${planCode}:`, error);
        }
      }
    }

    console.log(`✅ Created/updated ${createdCount} subscription plans`);
    return createdCount;
  } catch (error) {
    console.error('Error in seedSubscriptionPlans:', error);
    throw error;
  }
}

// Run the seed function if this file is executed directly
if (require.main === module) {
  seedSubscriptionPlans()
    .then((count) => {
      console.log(`Seeded ${count} subscription plans successfully`);
      process.exit(0);
    })
    .catch((e) => {
      console.error('Error seeding subscription plans:', e);
      process.exit(1);
    });
}
