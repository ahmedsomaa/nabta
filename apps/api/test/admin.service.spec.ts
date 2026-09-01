import { AdminService } from '../src/modules/admin/admin.service';
import { SearchService } from '../src/modules/admin/search.service';
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

describe('AdminService tenant isolation', () => {
  it('counts overview metrics for the caller schoolId', async () => {
    const studentCount = jest.fn().mockResolvedValue(2);
    const teacherCount = jest.fn().mockResolvedValue(1);
    const classCount = jest.fn().mockResolvedValue(3);
    const subjectCount = jest.fn().mockResolvedValue(4);
    const assignmentCount = jest.fn().mockResolvedValue(5);
    const prisma = {
      student: { count: studentCount, findMany: jest.fn().mockResolvedValue([]) },
      teacher: { count: teacherCount, findMany: jest.fn().mockResolvedValue([]) },
      schoolClass: { count: classCount, findMany: jest.fn().mockResolvedValue([]) },
      subject: { count: subjectCount },
      teachingAssignment: { count: assignmentCount },
      attendanceRecord: { findMany: jest.fn().mockResolvedValue([]) },
      assignment: { findMany: jest.fn().mockResolvedValue([]) },
      gradeRecord: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new AdminService(prisma as never);
    const result = await service.overview(adminA, {});
    expect(studentCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ schoolId: 'school-a' }) }),
    );
    expect(assignmentCount).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ schoolId: 'school-a' }) }),
    );
    expect(result.students).toBe(2);
    expect(result.teachers).toBe(1);
    expect(result.activeCourses).toBe(5);
  });

  it('refuses callers without a school', async () => {
    const service = new AdminService({} as never);
    await expect(service.overview({ ...adminA, schoolId: null }, {})).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('scopes attention lists to the caller schoolId', async () => {
    const studentFindMany = jest.fn().mockResolvedValue([]);
    const classFindMany = jest.fn().mockResolvedValue([]);
    const teacherFindMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      student: { count: jest.fn().mockResolvedValue(0), findMany: studentFindMany },
      teacher: { count: jest.fn().mockResolvedValue(0), findMany: teacherFindMany },
      schoolClass: { count: jest.fn().mockResolvedValue(0), findMany: classFindMany },
      subject: { count: jest.fn().mockResolvedValue(0) },
      teachingAssignment: { count: jest.fn().mockResolvedValue(0) },
      attendanceRecord: { findMany: jest.fn().mockResolvedValue([]) },
      assignment: { findMany: jest.fn().mockResolvedValue([]) },
      gradeRecord: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new AdminService(prisma as never);
    await service.overview(adminA, {});
    expect(studentFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ schoolId: 'school-a' }),
      }),
    );
    expect(classFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ schoolId: 'school-a' }),
      }),
    );
    expect(teacherFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ schoolId: 'school-a' }),
      }),
    );
  });
});

describe('SearchService tenant isolation', () => {
  it('scopes student hits to the caller schoolId', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      student: { findMany },
      teacher: { findMany: jest.fn().mockResolvedValue([]) },
      schoolClass: { findMany: jest.fn().mockResolvedValue([]) },
      subject: { findMany: jest.fn().mockResolvedValue([]) },
      lesson: { findMany: jest.fn().mockResolvedValue([]) },
      assignment: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new SearchService(prisma as never);
    await service.search(adminA, { q: 'omar' });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ schoolId: 'school-a' }),
      }),
    );
  });
});

describe('AdminService school settings', () => {
  it('loads settings for the caller schoolId', async () => {
    const findUnique = jest.fn().mockResolvedValue({
      id: 'school-a',
      name: 'School A',
      slug: 'school-a',
      locale: 'en',
    });
    const service = new AdminService({ school: { findUnique } } as never);
    const result = await service.getSchool(adminA);
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'school-a' } });
    expect(result.slug).toBe('school-a');
  });
});
