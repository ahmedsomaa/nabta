import { AssessmentsService } from '../src/modules/assessments/assessments.service';
import { GradeRecordService } from '../src/modules/assessments/grade-record.service';
import { scoreQuestion, letterFromPercent } from '../src/modules/assessments/scoring';
import type { AuthUser } from '@nabta/types';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

const teacherUser: AuthUser = {
  id: 'user-t',
  email: 'teacher@nabta.local',
  role: 'TEACHER',
  schoolId: 'school-a',
  schoolName: 'Egyptian International School',
  schoolLogoUrl: null,
  locale: 'en',
  theme: 'system',
  status: 'active',
};

const teacherRow = {
  id: 't-1',
  schoolId: 'school-a',
  givenName: 'Nadia',
  familyName: 'Hassan',
  teachingAssignments: [{ classId: 'c1', subjectId: 'math' }],
};

describe('scoring', () => {
  it('scores multiple choice all-or-nothing', () => {
    const question = {
      type: 'MULTIPLE_CHOICE' as const,
      points: 2,
      options: [
        { id: 'a', isCorrect: true, text: '4' },
        { id: 'b', isCorrect: false, text: '7' },
      ],
    };
    expect(scoreQuestion(question, ['a'], null)).toBe(2);
    expect(scoreQuestion(question, ['b'], null)).toBe(0);
    expect(scoreQuestion(question, ['a', 'b'], null)).toBe(0);
  });

  it('scores short answer case-insensitively', () => {
    const question = {
      type: 'SHORT_ANSWER' as const,
      points: 1,
      options: [{ id: 'a', isCorrect: true, text: 'm' }],
    };
    expect(scoreQuestion(question, [], 'M')).toBe(1);
    expect(scoreQuestion(question, [], 'slope')).toBe(0);
  });

  it('maps percentage to letter', () => {
    expect(letterFromPercent(91)).toBe('A');
    expect(letterFromPercent(60)).toBe('D');
    expect(letterFromPercent(59)).toBe('F');
  });
});

describe('AssessmentsService isolation', () => {
  it('refuses callers without a school', async () => {
    const service = new AssessmentsService({} as never, {} as GradeRecordService);
    await expect(
      service.listTeacherAssessments({ ...teacherUser, schoolId: null }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('hides assessments outside the teaching assignment', async () => {
    const prisma = {
      teacher: { findFirst: jest.fn().mockResolvedValue(teacherRow) },
      assessment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'q1',
          classId: 'other',
          subjectId: 'math',
          schoolId: 'school-a',
          class: { name: '10B' },
          subject: { name: 'Math' },
          questions: [],
        }),
      },
      teachingAssignment: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new AssessmentsService(prisma as never, { recompute: jest.fn() } as never);
    await expect(service.getTeacherAssessment(teacherUser, 'q1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
