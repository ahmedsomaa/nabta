import { StudentService } from '../src/modules/student/student.service';
import type { AuthUser } from '@nabta/types';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

const studentUser: AuthUser = {
  id: 'user-1',
  email: 'student@nabta.local',
  role: 'STUDENT',
  schoolId: 'school-a',
  schoolName: 'Egyptian International School',
  schoolLogoUrl: null,
  locale: 'en',
  theme: 'system',
  status: 'active',
};

describe('StudentService isolation', () => {
  it('loads the student profile for the caller school only', async () => {
    const findFirst = jest.fn().mockResolvedValue({
      id: 'st-1',
      schoolId: 'school-a',
      givenName: 'Omar',
      familyName: 'Farouk',
      enrollments: [{ classId: 'c1', class: { name: '10A' } }],
    });
    const prisma = { student: { findFirst } };
    const storage = { getUploadUrl: jest.fn() };
    const service = new StudentService(prisma as never, storage as never);
    const me = await service.getMe(studentUser);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', schoolId: 'school-a' },
      }),
    );
    expect(me.givenName).toBe('Omar');
  });

  it('hides assignments from other classes', async () => {
    const prisma = {
      student: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'st-1',
          schoolId: 'school-a',
          enrollments: [{ classId: 'c1', class: { name: '10A' } }],
        }),
      },
      assignment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'asg-1',
          classId: 'other-class',
          schoolId: 'school-a',
          title: 'Hidden',
          instructions: '',
          dueAt: new Date(),
          subjectId: 'sub',
          subject: { name: 'Math' },
          submissions: [],
        }),
      },
    };
    const service = new StudentService(prisma as never, { getUploadUrl: jest.fn() } as never);
    await expect(service.getAssignment(studentUser, 'asg-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses callers without a school', async () => {
    const service = new StudentService({} as never, { getUploadUrl: jest.fn() } as never);
    await expect(service.getMe({ ...studentUser, schoolId: null })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('marks a submission SUBMITTED before the due date', async () => {
    const dueAt = new Date(Date.now() + 86_400_000);
    const assignmentRow = {
      id: 'asg-1',
      classId: 'c1',
      schoolId: 'school-a',
      title: 'Worksheet',
      instructions: 'Do it',
      dueAt,
      subjectId: 'sub',
      subject: { name: 'Math' },
      submissions: [
        {
          id: 'sub-1',
          status: 'DRAFT',
          files: [{ id: 'f1', fileName: 'work.pdf', mimeType: 'application/pdf', size: 12 }],
        },
      ],
    };
    const prisma = {
      student: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'st-1',
          schoolId: 'school-a',
          enrollments: [{ classId: 'c1', class: { name: '10A' } }],
        }),
      },
      assignment: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(assignmentRow)
          .mockResolvedValueOnce({ id: 'asg-1', schoolId: 'school-a', dueAt })
          .mockResolvedValueOnce({
            ...assignmentRow,
            submissions: [{ ...assignmentRow.submissions[0], status: 'SUBMITTED' }],
          }),
      },
      assignmentSubmission: {
        findUnique: jest.fn().mockResolvedValue({ id: 'sub-1' }),
        update: jest.fn().mockResolvedValue({}),
      },
      submissionFile: { count: jest.fn().mockResolvedValue(1) },
    };
    const service = new StudentService(prisma as never, { getUploadUrl: jest.fn() } as never);
    const result = await service.submit(studentUser, 'asg-1');
    expect(prisma.assignmentSubmission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'SUBMITTED' }),
      }),
    );
    expect(result.status).toBe('SUBMITTED');
  });
});
