import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '@nabta/types';
import { PlatformService } from '../src/modules/platform/platform.service';
import { HealthService } from '../src/health.service';
import { RolesGuard } from '../src/common/guards/roles.guard';

const systemAdmin: AuthUser = {
  id: 'sys',
  email: 'system@nabta.local',
  role: 'SYSTEM_ADMIN',
  schoolId: null,
  schoolName: '',
  schoolLogoUrl: null,
  locale: 'en',
  theme: 'system',
  status: 'active',
};

const schoolAdmin: AuthUser = {
  ...systemAdmin,
  id: 'admin',
  email: 'admin@nabta.local',
  role: 'ADMIN',
  schoolId: 'school-a',
  schoolName: 'School A',
};

function mockContext(user?: AuthUser): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('PlatformService', () => {
  it('creates a school with a unique slug', async () => {
    const create = jest.fn().mockResolvedValue({
      id: 'new-school',
      name: 'Nile School',
      slug: 'nile-school',
      locale: 'en',
      _count: { students: 0, teachers: 0 },
    });
    const prisma = { school: { create } };
    const health = { check: jest.fn() };
    const service = new PlatformService(prisma as never, health as unknown as HealthService);
    const result = await service.createSchool({
      name: 'Nile School',
      slug: 'nile-school',
      locale: 'en',
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { name: 'Nile School', slug: 'nile-school', locale: 'en' },
      }),
    );
    expect(result.slug).toBe('nile-school');
    expect(result.studentCount).toBe(0);
  });

  it('rejects a duplicate slug', async () => {
    const prisma = {
      school: { create: jest.fn().mockRejectedValue({ code: 'P2002' }) },
    };
    const service = new PlatformService(prisma as never, { check: jest.fn() } as unknown as HealthService);
    await expect(
      service.createSchool({ name: 'Nile School', slug: 'nile-school', locale: 'en' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns overview counts and a health snapshot', async () => {
    const prisma = {
      school: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([
          { id: 's1', name: 'Egyptian International School', slug: 'eis', locale: 'en' },
        ]),
      },
      student: { count: jest.fn().mockResolvedValue(2) },
      teacher: { count: jest.fn().mockResolvedValue(3) },
      user: { count: jest.fn().mockResolvedValue(1) },
    };
    const health = {
      check: jest.fn().mockResolvedValue({
        status: 'ok',
        service: 'nabta-api',
        database: 'ok',
        redis: 'ok',
      }),
    };
    const service = new PlatformService(prisma as never, health as unknown as HealthService);
    const result = await service.overview();
    expect(result.schools).toBe(1);
    expect(result.students).toBe(2);
    expect(result.teachers).toBe(3);
    expect(result.schoolAdmins).toBe(1);
    expect(result.schoolsPreview[0].name).toBe('Egyptian International School');
    expect(result.health.database).toBe('ok');
  });

  it('updates name and locale without changing slug', async () => {
    const update = jest.fn().mockResolvedValue({
      id: 's1',
      name: 'EIS Cairo',
      slug: 'egyptian-international-school',
      locale: 'ar',
      _count: { students: 1, teachers: 1 },
    });
    const prisma = {
      school: {
        findUnique: jest.fn().mockResolvedValue({ id: 's1', slug: 'egyptian-international-school' }),
        update,
      },
    };
    const service = new PlatformService(prisma as never, { check: jest.fn() } as unknown as HealthService);
    const result = await service.updateSchool('s1', { name: 'EIS Cairo', locale: 'ar' });
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { name: 'EIS Cairo', locale: 'ar' },
      }),
    );
    expect(result.slug).toBe('egyptian-international-school');
  });

  it('throws when updating a missing school', async () => {
    const prisma = { school: { findUnique: jest.fn().mockResolvedValue(null) } };
    const service = new PlatformService(prisma as never, { check: jest.fn() } as unknown as HealthService);
    await expect(service.updateSchool('missing', { name: 'Gone' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('Platform routes role gate', () => {
  it('allows SYSTEM_ADMIN', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['SYSTEM_ADMIN']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(mockContext(systemAdmin))).toBe(true);
  });

  it('rejects a school ADMIN token', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['SYSTEM_ADMIN']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(() => guard.canActivate(mockContext(schoolAdmin))).toThrow(ForbiddenException);
  });
});
