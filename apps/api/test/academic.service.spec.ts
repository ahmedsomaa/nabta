import { AcademicService } from '../src/modules/academic/academic.service';
import type { AuthUser } from '@nabta/types';
import { ForbiddenException } from '@nestjs/common';

const adminA: AuthUser = {
  id: '1',
  email: 'a@school-a.local',
  role: 'ADMIN',
  schoolId: 'school-a',
  schoolName: 'School A',
  schoolLogoUrl: null,
  locale: 'en',
  theme: 'system',
  status: 'active',
};

describe('AcademicService tenant isolation', () => {
  it('scopes academic year lists to the caller schoolId', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prisma = {
      academicYear: { findMany, count },
    };
    const service = new AcademicService(prisma as never);
    await service.listYears(adminA, { page: 1, limit: 20 });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ schoolId: 'school-a' }),
      }),
    );
    expect(count).toHaveBeenCalledWith({ where: { schoolId: 'school-a' } });
  });

  it('scopes term lists to the caller schoolId and year', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      academicYear: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'year-1',
          schoolId: 'school-a',
          name: '2026/2027',
          startsOn: null,
          endsOn: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
      term: { findMany },
    };
    const service = new AcademicService(prisma as never);
    await service.listTerms(adminA, 'year-1');
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ schoolId: 'school-a', academicYearId: 'year-1' }),
      }),
    );
  });

  it('refuses callers without a school', async () => {
    const service = new AcademicService({} as never);
    await expect(
      service.listYears({ ...adminA, schoolId: null }, {}),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('scopes student search to the caller schoolId', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prisma = {
      student: { findMany, count },
      gradeRecord: { findMany: jest.fn().mockResolvedValue([]) },
      attendanceRecord: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new AcademicService(prisma as never);
    await service.listStudents(adminA, { q: 'omar', page: 1, limit: 20 });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ schoolId: 'school-a' }),
      }),
    );
  });

  it('unenrolls only within the caller school and class', async () => {
    const findFirstClass = jest.fn().mockResolvedValue({
      id: 'class-1',
      schoolId: 'school-a',
      gradeId: 'g1',
      name: '10A',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const findFirstEnrollment = jest.fn().mockResolvedValue({ id: 'en-1' });
    const del = jest.fn().mockResolvedValue({});
    const prisma = {
      schoolClass: { findFirst: findFirstClass },
      enrollment: { findFirst: findFirstEnrollment, delete: del },
    };
    const service = new AcademicService(prisma as never);
    await service.unenrollStudent(adminA, 'class-1', 'en-1');
    expect(findFirstEnrollment).toHaveBeenCalledWith({
      where: { id: 'en-1', classId: 'class-1', schoolId: 'school-a' },
    });
    expect(del).toHaveBeenCalledWith({ where: { id: 'en-1' } });
  });

  it('refuses deactivating the caller account', async () => {
    const prisma = {
      student: {
        findFirst: jest.fn().mockResolvedValue({ id: 'st-1', userId: '1', user: { id: '1' } }),
      },
    };
    const service = new AcademicService(prisma as never);
    await expect(
      service.updateStudent(adminA, 'st-1', { status: 'disabled' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('deletes teaching assignments only within the caller school', async () => {
    const findFirst = jest.fn().mockResolvedValue({ id: 'ta-1' });
    const del = jest.fn().mockResolvedValue({});
    const prisma = { teachingAssignment: { findFirst, delete: del } };
    const service = new AcademicService(prisma as never);
    await service.deleteTeachingAssignment(adminA, 'ta-1');
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'ta-1', schoolId: 'school-a' },
    });
    expect(del).toHaveBeenCalledWith({ where: { id: 'ta-1' } });
  });
});
