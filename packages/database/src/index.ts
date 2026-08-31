import { PrismaClient } from '@prisma/client';

export * from '@prisma/client';

export const prisma = new PrismaClient();

export function createPrismaClient() {
  return new PrismaClient();
}
