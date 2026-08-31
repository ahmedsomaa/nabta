import { config } from 'dotenv';
import { resolve } from 'node:path';
import { UserRole, Locale, ThemePreference } from '../src/generated/prisma/client';
import { createPrismaClient } from '../src/create-prisma-client';
import * as argon2 from 'argon2';

config({ path: resolve(__dirname, '../../../.env') });
config({ path: resolve(__dirname, '../.env') });

const prisma = createPrismaClient();

const SCHOOL_ID = '00000000-0000-4000-8000-000000000001';
const SUBJECTS = [
  { name: 'Mathematics', code: 'MATH' },
  { name: 'Physics', code: 'PHY' },
  { name: 'English', code: 'ENG' },
  { name: 'Biology', code: 'BIO' },
  { name: 'Computer Science', code: 'CS' },
] as const;

async function main() {
  const school = await prisma.school.upsert({
    where: { id: SCHOOL_ID },
    update: {
      name: 'Egyptian International School',
      slug: 'egyptian-international-school',
    },
    create: {
      id: SCHOOL_ID,
      name: 'Egyptian International School',
      slug: 'egyptian-international-school',
    },
  });

  const passwordHash = await argon2.hash('Password123!');

  const schoolUsers = [
    { email: 'admin@nabta.local', role: UserRole.ADMIN },
    { email: 'teacher@nabta.local', role: UserRole.TEACHER },
    { email: 'student@nabta.local', role: UserRole.STUDENT },
  ] as const;

  const users: Record<string, { id: string }> = {};
  for (const u of schoolUsers) {
    users[u.email] = await prisma.user.upsert({
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

  const year = await prisma.academicYear.upsert({
    where: { schoolId_name: { schoolId: school.id, name: '2026/2027' } },
    update: {},
    create: {
      schoolId: school.id,
      name: '2026/2027',
      startsOn: new Date('2026-09-01'),
      endsOn: new Date('2027-06-30'),
    },
  });

  const grades = [];
  for (const level of [7, 8, 9, 10, 11, 12]) {
    const grade = await prisma.grade.upsert({
      where: { academicYearId_level: { academicYearId: year.id, level } },
      update: { name: `Grade ${level}` },
      create: {
        schoolId: school.id,
        academicYearId: year.id,
        name: `Grade ${level}`,
        level,
      },
    });
    grades.push(grade);

    await prisma.schoolClass.upsert({
      where: { gradeId_name: { gradeId: grade.id, name: `${level}A` } },
      update: {},
      create: { schoolId: school.id, gradeId: grade.id, name: `${level}A` },
    });
    if (level === 10) {
      await prisma.schoolClass.upsert({
        where: { gradeId_name: { gradeId: grade.id, name: '10B' } },
        update: {},
        create: { schoolId: school.id, gradeId: grade.id, name: '10B' },
      });
    }
  }

  const grade10 = grades.find((g) => g.level === 10)!;
  const class10A = await prisma.schoolClass.findUniqueOrThrow({
    where: { gradeId_name: { gradeId: grade10.id, name: '10A' } },
  });

  const subjectRows = [];
  for (const subject of SUBJECTS) {
    subjectRows.push(
      await prisma.subject.upsert({
        where: { schoolId_name: { schoolId: school.id, name: subject.name } },
        update: { code: subject.code, gradeId: grade10.id },
        create: {
          schoolId: school.id,
          gradeId: grade10.id,
          name: subject.name,
          code: subject.code,
        },
      }),
    );
  }

  const teacherUser = users['teacher@nabta.local']!;
  const studentUser = users['student@nabta.local']!;

  const teacher = await prisma.teacher.upsert({
    where: { userId: teacherUser.id },
    update: { givenName: 'Nadia', familyName: 'Hassan', schoolId: school.id },
    create: {
      schoolId: school.id,
      userId: teacherUser.id,
      givenName: 'Nadia',
      familyName: 'Hassan',
    },
  });

  const student = await prisma.student.upsert({
    where: { userId: studentUser.id },
    update: { givenName: 'Omar', familyName: 'Farouk', schoolId: school.id },
    create: {
      schoolId: school.id,
      userId: studentUser.id,
      givenName: 'Omar',
      familyName: 'Farouk',
    },
  });

  await prisma.enrollment.upsert({
    where: { studentId_classId: { studentId: student.id, classId: class10A.id } },
    update: {},
    create: { schoolId: school.id, studentId: student.id, classId: class10A.id },
  });

  const math = subjectRows.find((s) => s.code === 'MATH')!;
  await prisma.teachingAssignment.upsert({
    where: {
      teacherId_subjectId_classId: {
        teacherId: teacher.id,
        subjectId: math.id,
        classId: class10A.id,
      },
    },
    update: {},
    create: {
      schoolId: school.id,
      teacherId: teacher.id,
      subjectId: math.id,
      classId: class10A.id,
    },
  });

  console.log('Seeded Egyptian International School (2026/2027, Grades 7–12)');
  console.log('  admin@nabta.local / teacher@nabta.local / student@nabta.local');
  console.log('  system@nabta.local (SYSTEM_ADMIN)');
  console.log('  Password123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
