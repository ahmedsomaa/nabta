import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '@nabta/types';
import { adminOverviewQuerySchema, updateSchoolSchema } from '@nabta/validation';
import { PrismaService } from '../../prisma/prisma.service';
import { requireSchoolId } from '../academic/school-scope';

const SUBMITTED = ['SUBMITTED', 'LATE', 'GRADED', 'RETURNED'] as const;
const ATTENTION_CAP = 5;

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(user: AuthUser, query: unknown) {
    const schoolId = requireSchoolId(user);
    const filters = adminOverviewQuerySchema.parse(query ?? {});
    const classIds = await this.scopedClassIds(schoolId, filters);
    const subjectIds = await this.scopedSubjectIds(schoolId, filters, classIds);
    const studentWhere = {
      schoolId,
      user: { status: 'active' as const },
      ...(classIds ? { enrollments: { some: { classId: { in: classIds } } } } : {}),
    };
    const teacherWhere = {
      schoolId,
      user: { status: 'active' as const },
      ...(filters.teacherId ? { id: filters.teacherId } : {}),
      ...(classIds || subjectIds
        ? {
            teachingAssignments: {
              some: {
                ...(classIds ? { classId: { in: classIds } } : {}),
                ...(subjectIds ? { subjectId: { in: subjectIds } } : {}),
              },
            },
          }
        : {}),
    };

    const [students, teachers, classes, subjects, activeCourses, attendance, completion, performance, attention] =
      await Promise.all([
        this.prisma.student.count({ where: studentWhere }),
        this.prisma.teacher.count({ where: teacherWhere }),
        this.prisma.schoolClass.count({
          where: { schoolId, ...(classIds ? { id: { in: classIds } } : {}) },
        }),
        this.prisma.subject.count({
          where: { schoolId, ...(subjectIds ? { id: { in: subjectIds } } : {}) },
        }),
        this.prisma.teachingAssignment.count({
          where: {
            schoolId,
            ...(classIds ? { classId: { in: classIds } } : {}),
            ...(subjectIds ? { subjectId: { in: subjectIds } } : {}),
            ...(filters.teacherId ? { teacherId: filters.teacherId } : {}),
          },
        }),
        this.attendancePercent(schoolId, classIds, subjectIds),
        this.assignmentCompletion(schoolId, classIds, subjectIds),
        this.performancePercent(schoolId, classIds, subjectIds, studentWhere),
        this.attention(schoolId, classIds, filters.teacherId),
      ]);

    return {
      students,
      teachers,
      classes,
      subjects,
      activeCourses,
      attendancePercent: attendance,
      assignmentCompletionPercent: completion,
      performancePercent: performance,
      attention,
    };
  }

  async getSchool(user: AuthUser) {
    const schoolId = requireSchoolId(user);
    const school = await this.prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) throw new NotFoundException('School not found.');
    return { id: school.id, name: school.name, slug: school.slug, locale: school.locale };
  }

  async updateSchool(user: AuthUser, raw: unknown) {
    const schoolId = requireSchoolId(user);
    const input = updateSchoolSchema.parse(raw);
    const school = await this.prisma.school.update({
      where: { id: schoolId },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.locale ? { locale: input.locale } : {}),
      },
    });
    return { id: school.id, name: school.name, slug: school.slug, locale: school.locale };
  }

  private async scopedClassIds(
    schoolId: string,
    filters: {
      academicYearId?: string;
      gradeId?: string;
      classId?: string;
      teacherId?: string;
    },
  ) {
    if (filters.classId) return [filters.classId];
    if (!filters.academicYearId && !filters.gradeId && !filters.teacherId) return null;
    const rows = await this.prisma.schoolClass.findMany({
      where: {
        schoolId,
        ...(filters.gradeId ? { gradeId: filters.gradeId } : {}),
        ...(filters.academicYearId ? { grade: { academicYearId: filters.academicYearId } } : {}),
        ...(filters.teacherId
          ? { teachingAssignments: { some: { teacherId: filters.teacherId } } }
          : {}),
      },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  private async scopedSubjectIds(
    schoolId: string,
    filters: { subjectId?: string; teacherId?: string },
    classIds: string[] | null,
  ) {
    if (filters.subjectId) return [filters.subjectId];
    if (!filters.teacherId && !classIds) return null;
    const rows = await this.prisma.subject.findMany({
      where: {
        schoolId,
        ...(filters.teacherId
          ? { teachingAssignments: { some: { teacherId: filters.teacherId } } }
          : {}),
        ...(classIds
          ? { teachingAssignments: { some: { classId: { in: classIds } } } }
          : {}),
      },
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  private async attendancePercent(
    schoolId: string,
    classIds: string[] | null,
    subjectIds: string[] | null,
  ) {
    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        schoolId,
        session: {
          ...(classIds ? { classId: { in: classIds } } : {}),
          ...(subjectIds ? { subjectId: { in: subjectIds } } : {}),
        },
      },
      select: { status: true },
    });
    if (records.length === 0) return null;
    const present = records.filter((row) => row.status === 'PRESENT' || row.status === 'LATE').length;
    return Math.round((present / records.length) * 100);
  }

  private async assignmentCompletion(
    schoolId: string,
    classIds: string[] | null,
    subjectIds: string[] | null,
  ) {
    const assignments = await this.prisma.assignment.findMany({
      where: {
        schoolId,
        publishedAt: { not: null },
        ...(classIds ? { classId: { in: classIds } } : {}),
        ...(subjectIds ? { subjectId: { in: subjectIds } } : {}),
      },
      select: { id: true, classId: true },
    });
    if (assignments.length === 0) return null;
    const classSet = [...new Set(assignments.map((item) => item.classId))];
    const enrollments = await this.prisma.enrollment.groupBy({
      by: ['classId'],
      where: { schoolId, classId: { in: classSet } },
      _count: { _all: true },
    });
    const enrolledByClass = new Map(enrollments.map((row) => [row.classId, row._count._all]));
    let expected = 0;
    for (const assignment of assignments) {
      expected += enrolledByClass.get(assignment.classId) ?? 0;
    }
    if (expected === 0) return null;
    const submitted = await this.prisma.assignmentSubmission.count({
      where: {
        schoolId,
        assignmentId: { in: assignments.map((item) => item.id) },
        status: { in: [...SUBMITTED] },
      },
    });
    return Math.round((submitted / expected) * 100);
  }

  private async performancePercent(
    schoolId: string,
    classIds: string[] | null,
    subjectIds: string[] | null,
    studentWhere: object,
  ) {
    const students = await this.prisma.student.findMany({
      where: studentWhere,
      select: { id: true },
    });
    const studentIds = students.map((row) => row.id);
    if (studentIds.length === 0) return null;
    const records = await this.prisma.gradeRecord.findMany({
      where: {
        schoolId,
        studentId: { in: studentIds },
        ...(classIds ? { classId: { in: classIds } } : {}),
        ...(subjectIds ? { subjectId: { in: subjectIds } } : {}),
      },
      select: { percentage: true },
    });
    if (records.length === 0) return null;
    const sum = records.reduce((total, row) => total + Number(row.percentage), 0);
    return Math.round(sum / records.length);
  }

  private async attention(schoolId: string, classIds: string[] | null, teacherId?: string) {
    const unenrolledWhere = {
      schoolId,
      user: { status: 'active' as const },
      enrollments: { none: {} },
    };
    const classWhere = {
      schoolId,
      teachingAssignments: { none: {} },
      ...(classIds ? { id: { in: classIds } } : {}),
    };
    const teacherWhere = {
      schoolId,
      user: { status: 'active' as const },
      teachingAssignments: { none: {} },
      ...(teacherId ? { id: teacherId } : {}),
    };

    const [unenrolledCount, unenrolled, classCount, classes, teacherCount, teachers] = await Promise.all([
      this.prisma.student.count({ where: unenrolledWhere }),
      this.prisma.student.findMany({
        where: unenrolledWhere,
        orderBy: { familyName: 'asc' },
        take: ATTENTION_CAP,
        select: { id: true, givenName: true, familyName: true },
      }),
      this.prisma.schoolClass.count({ where: classWhere }),
      this.prisma.schoolClass.findMany({
        where: classWhere,
        orderBy: { name: 'asc' },
        take: ATTENTION_CAP,
        select: { id: true, name: true },
      }),
      this.prisma.teacher.count({ where: teacherWhere }),
      this.prisma.teacher.findMany({
        where: teacherWhere,
        orderBy: { familyName: 'asc' },
        take: ATTENTION_CAP,
        select: { id: true, givenName: true, familyName: true },
      }),
    ]);

    return {
      unenrolledStudents: {
        count: unenrolledCount,
        items: unenrolled.map((row) => ({
          id: row.id,
          title: `${row.givenName} ${row.familyName}`,
          href: `/admin/users/students/${row.id}`,
        })),
      },
      classesWithoutTeacher: {
        count: classCount,
        items: classes.map((row) => ({
          id: row.id,
          title: row.name,
          href: `/admin/academics/classes/${row.id}`,
        })),
      },
      teachersWithoutAssignment: {
        count: teacherCount,
        items: teachers.map((row) => ({
          id: row.id,
          title: `${row.givenName} ${row.familyName}`,
          href: `/admin/users/teachers/${row.id}`,
        })),
      },
    };
  }
}
