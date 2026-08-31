import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@nabta/types';
import { PrismaService } from '../../prisma/prisma.service';

const withSchool = { school: true } as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: withSchool,
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: withSchool,
    });
  }

  toAuthUser(user: {
    id: string;
    email: string;
    role: AuthUser['role'];
    schoolId: string | null;
    locale: AuthUser['locale'];
    theme: AuthUser['theme'];
    status: AuthUser['status'];
    school?: { name: string } | null;
  }): AuthUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId,
      schoolName: user.school?.name ?? '',
      schoolLogoUrl: null,
      locale: user.locale,
      theme: user.theme,
      status: user.status,
    };
  }
}
