import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MappingRow {
  planType: string;
  billingCycle: string;
  paddleProductId: string;
  paddlePriceId: string;
}

function parseCsv(filePath: string): MappingRow[] {
  const rows = fs
    .readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean);

  const header = rows.shift();

  if (!header) {
    throw new Error('CSV file is empty');
  }

  return rows.map((row) => {
    const [planType, billingCycle, paddleProductId, paddlePriceId] = row.split(',').map((value) => value.trim());

    if (!planType || !billingCycle || !paddlePriceId) {
      throw new Error(`Invalid row: ${row}`);
    }

    return { planType, billingCycle, paddleProductId, paddlePriceId };
  });
}

async function main() {
  const file = process.argv[2];

  if (!file) {
    console.error('Usage: ts-node scripts/mapPaddleIds.ts <mapping.csv>');
    process.exit(1);
  }

  const filePath = path.resolve(file);
  const rows = parseCsv(filePath);

  for (const row of rows) {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: {
        planType_billingCycle: {
          planType: row.planType as any,
          billingCycle: row.billingCycle as any,
        },
      },
    });

    if (!plan) {
      console.warn(`Plan ${row.planType} (${row.billingCycle}) not found. Skipping.`);
      continue;
    }

    await prisma.subscriptionPlan.update({
      where: { id: plan.id },
      data: {
        paddlePriceId: row.paddlePriceId,
        paddleProductId: row.paddleProductId || plan.paddleProductId,
      },
    });

    console.log(`Updated ${row.planType} (${row.billingCycle}) with Paddle price ${row.paddlePriceId}`);
  }

  console.log('Paddle ID mapping complete.');
}

main()
  .catch((error) => {
    console.error('Failed to map Paddle IDs:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
