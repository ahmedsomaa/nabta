import { config } from 'dotenv';
import { resolve } from 'node:path';
import { PrismaClient, UserRole, Locale, ThemePreference } from '@prisma/client';
import * as argon2 from 'argon2';

config({ path: resolve(__dirname, '../../../.env') });
config({ path: resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

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

  const users = [
    { email: 'admin@nabta.local', role: UserRole.ADMIN },
    { email: 'teacher@nabta.local', role: UserRole.TEACHER },
    { email: 'student@nabta.local', role: UserRole.STUDENT },
  ] as const;

  for (const u of users) {
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

  console.log('Seeded demo school and users (Password123!)');
  console.log('  admin@nabta.local / teacher@nabta.local / student@nabta.local');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
