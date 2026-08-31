import { TenantGuard } from '../src/modules/academic/tenant.guard';
import type { AuthUser } from '@nabta/types';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';

function mockContext(user?: AuthUser): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

const admin: AuthUser = {
  id: '1',
  email: 'a@b.c',
  role: 'ADMIN',
  schoolId: 'school-a',
  schoolName: 'Egyptian International School',
  schoolLogoUrl: null,
  locale: 'en',
  theme: 'system',
  status: 'active',
};

describe('TenantGuard', () => {
  const guard = new TenantGuard();

  it('allows a user with a schoolId', () => {
    expect(guard.canActivate(mockContext(admin))).toBe(true);
  });

  it('rejects missing auth', () => {
    expect(() => guard.canActivate(mockContext(undefined))).toThrow(UnauthorizedException);
  });

  it('rejects SYSTEM_ADMIN without a school', () => {
    const platform = { ...admin, role: 'SYSTEM_ADMIN' as const, schoolId: null };
    expect(() => guard.canActivate(mockContext(platform))).toThrow(ForbiddenException);
  });
});
