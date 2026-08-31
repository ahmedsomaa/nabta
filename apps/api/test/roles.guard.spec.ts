import { RolesGuard } from '../src/common/guards/roles.guard';
import { Reflector } from '@nestjs/core';
import type { AuthUser } from '@nabta/types';
import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';

function mockContext(user?: AuthUser): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const admin: AuthUser = {
    id: '1',
    email: 'a@b.c',
    role: 'ADMIN',
    schoolId: 's',
    locale: 'en',
    theme: 'system',
    status: 'active',
  };

  const student: AuthUser = { ...admin, role: 'STUDENT' };

  it('allows matching role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(mockContext(admin))).toBe(true);
  });

  it('rejects mismatched role', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['ADMIN']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(() => guard.canActivate(mockContext(student))).toThrow(ForbiddenException);
  });
});
