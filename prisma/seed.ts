import { db } from '../src/prisma/prismaWrapper';
import { seedSubscriptionPlans } from './seeds/subscriptionSeed';
import { seedCoupons } from './seeds/couponSeed';
import { seedQuizData } from './seeds/quizSeed';

async function main() {
  console.log('Starting seeding...');
  
  // Clear existing quiz data
  await db.quizOption.deleteMany({});
  await db.quizQuestion.deleteMany({});
  await db.quizSection.deleteMany({});
  
  // Clear existing subscription data (respecting FK order)
  await db.billingInvoice.deleteMany({});
  await db.couponRedemption.deleteMany({});
  await db.coupon.deleteMany({});
  await db.userSubscription.deleteMany({});
  await db.subscriptionPlan.deleteMany({});
  
  // Seed quiz data using the new structured approach
  await seedQuizData();
  
  // Seed subscription plans
  await seedSubscriptionPlans();

  // Seed coupons
  await seedCoupons();
  
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
