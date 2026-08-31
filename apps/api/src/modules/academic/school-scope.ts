import { ForbiddenException } from '@nestjs/common';
import type { AuthUser } from '@nabta/types';

export function requireSchoolId(user: AuthUser): string {
  if (!user.schoolId) {
    throw new ForbiddenException('No school is associated with this account.');
  }
  return user.schoolId;
}
