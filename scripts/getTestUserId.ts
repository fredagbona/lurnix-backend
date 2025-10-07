/**
 * Helper script to get a user ID for testing
 * Usage: npx tsx scripts/getTestUserId.ts
 */

import { prisma } from '../src/prisma/typedClient';

async function getTestUserId() {
  console.log('\n🔍 Finding users in database...\n');

  const users = await prisma.user.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      fullname: true,
      createdAt: true,
      subscriptions: {
        where: {
          status: { in: ['active', 'pending', 'paused'] },
        },
        select: {
          status: true,
          plan: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (users.length === 0) {
    console.log('❌ No users found in database');
    console.log('\nCreate a user first:');
    console.log('  1. Start the server: npm run dev');
    console.log('  2. Register via API: POST /api/auth/register');
    console.log('  3. Or use Prisma Studio: npm run db:studio\n');
    process.exit(1);
  }

  console.log(`Found ${users.length} user(s):\n`);

  users.forEach((user, index) => {
    const hasSubscription = user.subscriptions.length > 0;
    const subInfo = hasSubscription
      ? `${user.subscriptions[0].plan.name} (${user.subscriptions[0].status})`
      : 'No subscription';

    console.log(`${index + 1}. ${user.email}`);
    console.log(`   Name: ${user.fullname}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Subscription: ${subInfo}`);
    console.log(`   Created: ${user.createdAt.toISOString()}`);
    console.log('');
  });

  const firstUser = users[0];
  const hasActiveSubscription = firstUser.subscriptions.length > 0;

  console.log('💡 Quick test command:\n');
  
  if (hasActiveSubscription) {
    console.log(`   ⚠️  User already has subscription: ${firstUser.subscriptions[0].plan.name}`);
    console.log(`   Use --force flag or choose a different user\n`);
  }

  console.log(`   npx tsx scripts/testPaddleFlow.ts ${firstUser.id} master monthly\n`);
}

getTestUserId()
  .catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
