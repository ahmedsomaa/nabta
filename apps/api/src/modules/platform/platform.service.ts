import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createPlatformSchoolSchema, updatePlatformSchoolSchema } from '@nabta/validation';
import type { Locale, PlatformSchool } from '@nabta/types';
import { PrismaService } from '../../prisma/prisma.service';
import { HealthService } from '../../health.service';

const PREVIEW_CAP = 5;

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === 'P2002'
  );
}

function toSchool(row: {
  id: string;
  name: string;
  slug: string;
  locale: Locale;
  _count: { students: number; teachers: number };
}): PlatformSchool {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    locale: row.locale,
    studentCount: row._count.students,
    teacherCount: row._count.teachers,
  };
}

@Injectable()
export class PlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly health: HealthService,
  ) {}

  async overview() {
    const [schools, students, teachers, schoolAdmins, health, preview] = await Promise.all([
      this.prisma.school.count(),
      this.prisma.student.count(),
      this.prisma.teacher.count(),
      this.prisma.user.count({ where: { role: 'ADMIN' } }),
      this.health.check(),
      this.prisma.school.findMany({
        orderBy: { name: 'asc' },
        take: PREVIEW_CAP,
        select: { id: true, name: true, slug: true, locale: true },
      }),
    ]);

    return {
      schools,
      students,
      teachers,
      schoolAdmins,
      health,
      schoolsPreview: preview.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        locale: row.locale as Locale,
      })),
    };
  }

  async listSchools() {
    const rows = await this.prisma.school.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { students: true, teachers: true } } },
    });
    return rows.map((row) => toSchool({ ...row, locale: row.locale as Locale }));
  }

  async createSchool(raw: unknown) {
    const input = createPlatformSchoolSchema.parse(raw);
    try {
      const school = await this.prisma.school.create({
        data: { name: input.name, slug: input.slug, locale: input.locale },
        include: { _count: { select: { students: true, teachers: true } } },
      });
      return toSchool({ ...school, locale: school.locale as Locale });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('A school with that slug already exists.');
      }
      throw error;
    }
  }

  async updateSchool(id: string, raw: unknown) {
    const input = updatePlatformSchoolSchema.parse(raw);
    const existing = await this.prisma.school.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('School not found.');
    const school = await this.prisma.school.update({
      where: { id },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.locale ? { locale: input.locale } : {}),
      },
      include: { _count: { select: { students: true, teachers: true } } },
    });
    return toSchool({ ...school, locale: school.locale as Locale });
  }
}
