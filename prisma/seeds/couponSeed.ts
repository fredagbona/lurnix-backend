import { Prisma } from '@prisma/client';
import { db } from '../../src/prisma/prismaWrapper';

const decimal = (value: number) => new Prisma.Decimal(value);

const COUPONS = [
  {
    code: 'WELCOME10',
    name: 'Welcome 10% Off',
    description: '10% discount for first-time Builder subscribers',
    discountType: 'percentage' as const,
    discountValue: decimal(10),
    appliesTo: 'plan_type' as const,
    appliesToValue: 'builder',
    minimumCommitment: null,
    firstTimeUsersOnly: true,
    maxRedemptions: 1000,
    maxPerUser: 1,
  },
  {
    code: 'MASTER50',
    name: 'Master Annual $50 Off',
    description: '$50 discount on Master annual commitment',
    discountType: 'fixed_amount' as const,
    discountValue: decimal(50),
    appliesTo: 'plan_type' as const,
    appliesToValue: 'master',
    minimumCommitment: 'twelve_months' as const,
    firstTimeUsersOnly: false,
    maxRedemptions: 500,
    maxPerUser: 1,
  },
  {
    code: 'BUILDER6SAVE',
    name: 'Builder 6-Month Saver',
    description: 'Extra savings on Builder 6-month commitment',
    discountType: 'percentage' as const,
    discountValue: decimal(5),
    appliesTo: 'plan_type' as const,
    appliesToValue: 'builder',
    minimumCommitment: 'six_months' as const,
    firstTimeUsersOnly: false,
    maxRedemptions: null,
    maxPerUser: 2,
  },
];

export async function seedCoupons() {
  console.log('🌱 Seeding coupons...');

  let createdCount = 0;

  for (const coupon of COUPONS) {
    await db.coupon.upsert({
      where: { code: coupon.code },
      update: {
        name: coupon.name,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        appliesTo: coupon.appliesTo,
        appliesToValue: coupon.appliesToValue,
        minimumCommitment: coupon.minimumCommitment,
        firstTimeUsersOnly: coupon.firstTimeUsersOnly,
        maxRedemptions: coupon.maxRedemptions,
        maxPerUser: coupon.maxPerUser,
        isActive: true,
      },
      create: {
        code: coupon.code,
        name: coupon.name,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        appliesTo: coupon.appliesTo,
        appliesToValue: coupon.appliesToValue,
        minimumCommitment: coupon.minimumCommitment,
        firstTimeUsersOnly: coupon.firstTimeUsersOnly,
        maxRedemptions: coupon.maxRedemptions,
        maxPerUser: coupon.maxPerUser,
        isActive: true,
      },
    });

    createdCount += 1;
  }

  console.log(`✅ Created/updated ${createdCount} coupons`);
  return createdCount;
}

if (require.main === module) {
  seedCoupons()
    .then((count) => {
      console.log(`Seeded ${count} coupons successfully`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error seeding coupons:', error);
      process.exit(1);
    });
}
