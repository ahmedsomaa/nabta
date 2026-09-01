import { Injectable } from '@nestjs/common';
import type { AuthUser, SearchHit } from '@nabta/types';
import { searchQuerySchema } from '@nabta/validation';
import { PrismaService } from '../../prisma/prisma.service';
import { requireSchoolId } from '../academic/school-scope';

const LIMIT = 8;

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(user: AuthUser, query: unknown): Promise<{ data: SearchHit[] }> {
    const schoolId = requireSchoolId(user);
    const input = searchQuerySchema.parse(query);
    const q = input.q.trim();
    const allowed = new Set(
      (input.types?.split(',') ?? ['student', 'teacher', 'class', 'subject', 'lesson', 'assignment'])
        .map((item) => item.trim())
        .filter(Boolean),
    );
    const hits: SearchHit[] = [];
    const contains = { contains: q, mode: 'insensitive' as const };

    if (allowed.has('student')) {
      const rows = await this.prisma.student.findMany({
        where: {
          schoolId,
          OR: [{ givenName: contains }, { familyName: contains }, { user: { email: contains } }],
        },
        take: LIMIT,
        orderBy: { familyName: 'asc' },
        include: { user: { select: { email: true } } },
      });
      for (const row of rows) {
        hits.push({
          type: 'student',
          id: row.id,
          title: `${row.givenName} ${row.familyName}`,
          subtitle: row.user.email,
          href: `/admin/users/students/${row.id}`,
        });
      }
    }

    if (allowed.has('teacher')) {
      const rows = await this.prisma.teacher.findMany({
        where: {
          schoolId,
          OR: [{ givenName: contains }, { familyName: contains }, { user: { email: contains } }],
        },
        take: LIMIT,
        orderBy: { familyName: 'asc' },
        include: { user: { select: { email: true } } },
      });
      for (const row of rows) {
        hits.push({
          type: 'teacher',
          id: row.id,
          title: `${row.givenName} ${row.familyName}`,
          subtitle: row.user.email,
          href: `/admin/users/teachers/${row.id}`,
        });
      }
    }

    if (allowed.has('class')) {
      const rows = await this.prisma.schoolClass.findMany({
        where: { schoolId, name: contains },
        take: LIMIT,
        include: { grade: true },
      });
      for (const row of rows) {
        hits.push({
          type: 'class',
          id: row.id,
          title: row.name,
          subtitle: row.grade.name,
          href: `/admin/academics/classes/${row.id}`,
        });
      }
    }

    if (allowed.has('subject')) {
      const rows = await this.prisma.subject.findMany({
        where: { schoolId, OR: [{ name: contains }, { code: contains }] },
        take: LIMIT,
      });
      for (const row of rows) {
        hits.push({
          type: 'subject',
          id: row.id,
          title: row.name,
          subtitle: row.code,
          href: '/admin/academics',
        });
      }
    }

    if (allowed.has('lesson')) {
      const rows = await this.prisma.lesson.findMany({
        where: { schoolId, title: contains },
        take: LIMIT,
        include: { unit: { include: { subject: true } } },
      });
      for (const row of rows) {
        hits.push({
          type: 'lesson',
          id: row.id,
          title: row.title,
          subtitle: row.unit.subject.name,
          href: '/admin/academics',
        });
      }
    }

    if (allowed.has('assignment')) {
      const rows = await this.prisma.assignment.findMany({
        where: { schoolId, title: contains },
        take: LIMIT,
        include: { subject: true },
      });
      for (const row of rows) {
        hits.push({
          type: 'assignment',
          id: row.id,
          title: row.title,
          subtitle: row.subject.name,
          href: '/admin/academics',
        });
      }
    }

    return { data: hits };
  }
}
