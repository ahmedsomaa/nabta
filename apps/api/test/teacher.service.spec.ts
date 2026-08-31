import { TeacherService } from '../src/modules/teacher/teacher.service';
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

describe('TeacherService isolation', () => {
  it('loads the teacher profile for the caller school only', async () => {
    const findFirst = jest.fn().mockResolvedValue(teacherRow);
    const prisma = { teacher: { findFirst } };
    const service = new TeacherService(prisma as never, { getUploadUrl: jest.fn() } as never);
    const me = await service.getMe(teacherUser);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-t', schoolId: 'school-a' },
      }),
    );
    expect(me.givenName).toBe('Nadia');
  });

  it('refuses callers without a school', async () => {
    const service = new TeacherService({} as never, { getUploadUrl: jest.fn() } as never);
    await expect(service.getMe({ ...teacherUser, schoolId: null })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('hides assignments outside the teaching assignment', async () => {
    const prisma = {
      teacher: { findFirst: jest.fn().mockResolvedValue(teacherRow) },
      assignment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'asg-1',
          classId: 'other-class',
          subjectId: 'math',
          schoolId: 'school-a',
          class: { name: '10B' },
          subject: { name: 'Math' },
          files: [],
        }),
      },
      teachingAssignment: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new TeacherService(prisma as never, { getUploadUrl: jest.fn() } as never);
    await expect(service.getAssignment(teacherUser, 'asg-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('grades then publish-grades returns RETURNED', async () => {
    const submission = {
      id: 'sub-1',
      assignmentId: 'asg-1',
      studentId: 'st-1',
      status: 'SUBMITTED',
      submittedAt: new Date(),
      score: null,
      feedback: null,
      gradesPublishedAt: null,
      student: { givenName: 'Omar', familyName: 'Farouk' },
      files: [],
      assignment: {
        title: 'Worksheet',
        maxScore: 100,
        classId: 'c1',
        subjectId: 'math',
      },
    };
    const prisma = {
      teacher: { findFirst: jest.fn().mockResolvedValue(teacherRow) },
      teachingAssignment: { findFirst: jest.fn().mockResolvedValue({ id: 'ta' }) },
      assignmentSubmission: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(submission)
          .mockResolvedValueOnce({
            ...submission,
            status: 'GRADED',
            score: 18,
            feedback: 'Clear working.',
          }),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'sub-1',
            studentId: 'st-1',
            status: 'RETURNED',
            submittedAt: new Date(),
            score: 18,
            gradesPublishedAt: new Date(),
          },
        ]),
      },
      assignment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'asg-1',
          classId: 'c1',
          subjectId: 'math',
          schoolId: 'school-a',
          class: { name: '10A' },
          subject: { name: 'Math' },
          files: [],
        }),
      },
      enrollment: {
        findMany: jest.fn().mockResolvedValue([
          { studentId: 'st-1', student: { givenName: 'Omar', familyName: 'Farouk' } },
        ]),
      },
    };
    const storage = { getUploadUrl: jest.fn(), getObjectUrl: jest.fn().mockResolvedValue('https://file') };
    const service = new TeacherService(prisma as never, storage as never);
    const graded = await service.gradeSubmission(teacherUser, 'sub-1', { score: 18, feedback: 'Clear working.' });
    expect(prisma.assignmentSubmission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'GRADED', score: 18 }),
      }),
    );
    expect(graded.score).toBe(18);
    const published = await service.publishGrades(teacherUser, 'asg-1');
    expect(prisma.assignmentSubmission.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'RETURNED' }),
      }),
    );
    expect(published[0]?.status).toBe('RETURNED');
  });
});
