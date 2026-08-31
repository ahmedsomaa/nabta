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

  const UNIT_ID = '00000000-0000-4000-8000-000000000101';
  const LESSON_IDS = [
    '00000000-0000-4000-8000-000000000111',
    '00000000-0000-4000-8000-000000000112',
    '00000000-0000-4000-8000-000000000113',
    '00000000-0000-4000-8000-000000000114',
  ] as const;
  const ASSIGNMENT_IDS = [
    '00000000-0000-4000-8000-000000000121',
    '00000000-0000-4000-8000-000000000122',
  ] as const;

  await prisma.unit.upsert({
    where: { id: UNIT_ID },
    update: { title: 'Linear equations', sortOrder: 0, classId: class10A.id },
    create: {
      id: UNIT_ID,
      schoolId: school.id,
      subjectId: math.id,
      classId: class10A.id,
      title: 'Linear equations',
      sortOrder: 0,
    },
  });

  const publishedAt = new Date();

  await prisma.lesson.upsert({
    where: { id: LESSON_IDS[0] },
    update: { publishedAt },
    create: {
      id: LESSON_IDS[0],
      schoolId: school.id,
      unitId: UNIT_ID,
      title: 'What is a linear equation?',
      type: 'RICH_TEXT',
      body: 'A linear equation is an equation whose graph is a straight line. In Grade 10 we write it as y = mx + c, where m is the gradient and c is the y-intercept.\n\nWorked example: 2x + 3 = 11. Subtract 3 from both sides: 2x = 8. Divide by 2: x = 4.',
      publishedAt,
      sortOrder: 0,
    },
  });

  await prisma.lesson.upsert({
    where: { id: LESSON_IDS[1] },
    update: { publishedAt },
    create: {
      id: LESSON_IDS[1],
      schoolId: school.id,
      unitId: UNIT_ID,
      title: 'Khan Academy — graphing lines',
      type: 'EXTERNAL',
      url: 'https://www.khanacademy.org/math/algebra/x2f8bb11595b61c86:linear-equations-graphs',
      publishedAt,
      sortOrder: 1,
    },
  });

  await prisma.lesson.upsert({
    where: { id: LESSON_IDS[2] },
    update: { publishedAt },
    create: {
      id: LESSON_IDS[2],
      schoolId: school.id,
      unitId: UNIT_ID,
      title: 'Practice worksheet (PDF)',
      type: 'PDF',
      url: 'https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf',
      publishedAt,
      sortOrder: 2,
    },
  });

  await prisma.lesson.upsert({
    where: { id: LESSON_IDS[3] },
    update: { publishedAt: null, title: 'Draft: simultaneous equations' },
    create: {
      id: LESSON_IDS[3],
      schoolId: school.id,
      unitId: UNIT_ID,
      title: 'Draft: simultaneous equations',
      type: 'RICH_TEXT',
      body: 'Teacher draft — not visible to students until published.',
      publishedAt: null,
      sortOrder: 3,
    },
  });

  for (let weekday = 0; weekday <= 6; weekday += 1) {
    const slotId = `00000000-0000-4000-8000-0000000002${String(weekday).padStart(2, '0')}`;
    await prisma.timetableSlot.upsert({
      where: { id: slotId },
      update: {},
      create: {
        id: slotId,
        schoolId: school.id,
        classId: class10A.id,
        subjectId: math.id,
        weekday,
        startsAt: '08:00',
        endsAt: '08:45',
        room: '204',
      },
    });
  }

  const soon = new Date();
  soon.setDate(soon.getDate() + 5);
  soon.setHours(16, 0, 0, 0);
  const later = new Date();
  later.setDate(later.getDate() + 21);
  later.setHours(16, 0, 0, 0);

  await prisma.assignment.upsert({
    where: { id: ASSIGNMENT_IDS[0] },
    update: { dueAt: soon, publishedAt },
    create: {
      id: ASSIGNMENT_IDS[0],
      schoolId: school.id,
      subjectId: math.id,
      classId: class10A.id,
      title: 'Linear equations worksheet',
      instructions:
        'Complete questions 1–8 on solving linear equations. Upload a single PDF or photo of your work before the deadline.',
      dueAt: soon,
      publishedAt,
    },
  });

  await prisma.assignment.upsert({
    where: { id: ASSIGNMENT_IDS[1] },
    update: { dueAt: later, publishedAt },
    create: {
      id: ASSIGNMENT_IDS[1],
      schoolId: school.id,
      subjectId: math.id,
      classId: class10A.id,
      title: 'Gradient and intercept',
      instructions:
        'Sketch y = 2x − 1 and y = −x + 4 on the same axes. Label the intercepts. Submit one PDF.',
      dueAt: later,
      publishedAt,
    },
  });

  const SUBMISSION_ID = '00000000-0000-4000-8000-000000000131';
  const SUBMISSION_FILE_ID = '00000000-0000-4000-8000-000000000132';
  await prisma.assignmentSubmission.upsert({
    where: { assignmentId_studentId: { assignmentId: ASSIGNMENT_IDS[0], studentId: student.id } },
    update: { status: 'SUBMITTED', submittedAt: new Date() },
    create: {
      id: SUBMISSION_ID,
      schoolId: school.id,
      assignmentId: ASSIGNMENT_IDS[0],
      studentId: student.id,
      status: 'SUBMITTED',
      submittedAt: new Date(),
    },
  });
  const submission = await prisma.assignmentSubmission.findUniqueOrThrow({
    where: { assignmentId_studentId: { assignmentId: ASSIGNMENT_IDS[0], studentId: student.id } },
  });
  await prisma.submissionFile.upsert({
    where: { id: SUBMISSION_FILE_ID },
    update: { submissionId: submission.id },
    create: {
      id: SUBMISSION_FILE_ID,
      schoolId: school.id,
      submissionId: submission.id,
      storageKey: `${school.id}/submissions/${ASSIGNMENT_IDS[0]}/${student.id}/seed.txt`,
      fileName: 'linear-equations.txt',
      mimeType: 'text/plain',
      size: 48,
    },
  });

  await prisma.lessonProgress.upsert({
    where: { studentId_lessonId: { studentId: student.id, lessonId: LESSON_IDS[0] } },
    update: { lastAccessedAt: new Date() },
    create: {
      schoolId: school.id,
      studentId: student.id,
      lessonId: LESSON_IDS[0],
      lastAccessedAt: new Date(),
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
