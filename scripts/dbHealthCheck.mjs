import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  try {
    await prisma.$queryRaw`SELECT 1 as ok`;
    console.log('DB health: connected');
    process.exit(0);
  } catch (error) {
    console.error('DB health: failed');
    console.error(error?.message || error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

run();
