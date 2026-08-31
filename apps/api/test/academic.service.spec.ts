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

  it('refuses callers without a school', async () => {
    const service = new AcademicService({} as never);
    await expect(
      service.listYears({ ...adminA, schoolId: null }, {}),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
