import { Injectable } from '@nestjs/common';
import type { AuthUser } from '@nabta/types';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  toAuthUser(user: {
    id: string;
    email: string;
    role: AuthUser['role'];
    schoolId: string;
    locale: AuthUser['locale'];
    theme: AuthUser['theme'];
    status: AuthUser['status'];
  }): AuthUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId,
      locale: user.locale,
      theme: user.theme,
      status: user.status,
    };
  }
}
