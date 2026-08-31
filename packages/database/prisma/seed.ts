import { config } from 'dotenv';
import { resolve } from 'node:path';
import { UserRole, Locale, ThemePreference } from '../src/generated/prisma/client';
import { createPrismaClient } from '../src/create-prisma-client';
import * as argon2 from 'argon2';

config({ path: resolve(__dirname, '../../../.env') });
config({ path: resolve(__dirname, '../.env') });

const prisma = createPrismaClient();

async function main() {
  const school = await prisma.school.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Nabta Demo School',
    },
  });

  const passwordHash = await argon2.hash('Password123!');

  const schoolUsers = [
    { email: 'admin@nabta.local', role: UserRole.ADMIN },
    { email: 'teacher@nabta.local', role: UserRole.TEACHER },
    { email: 'student@nabta.local', role: UserRole.STUDENT },
  ] as const;

  for (const u of schoolUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash, role: u.role, schoolId: school.id, status: 'active' },
      create: {
        email: u.email,
        passwordHash,
        role: u.role,
        schoolId: school.id,
        locale: Locale.en,
        theme: ThemePreference.system,
      },
    });
  }

  await prisma.user.upsert({
    where: { email: 'system@nabta.local' },
    update: {
      passwordHash,
      role: UserRole.SYSTEM_ADMIN,
      schoolId: null,
      status: 'active',
    },
    create: {
      email: 'system@nabta.local',
      passwordHash,
      role: UserRole.SYSTEM_ADMIN,
      schoolId: null,
      locale: Locale.en,
      theme: ThemePreference.system,
    },
  });

  console.log('Seeded demo school and users (Password123!)');
  console.log('  admin@nabta.local / teacher@nabta.local / student@nabta.local');
  console.log('  system@nabta.local (SYSTEM_ADMIN)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
