import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@nabta/database';
import * as argon2 from 'argon2';
import type { AuthUser } from '@nabta/types';
import {
  createAcademicYearSchema,
  createClassSchema,
  createEnrollmentSchema,
  createGradeSchema,
  createStudentSchema,
  createSubjectSchema,
  createTeacherSchema,
  createTeachingAssignmentSchema,
  createTermSchema,
  listClassesQuerySchema,
  listGradesQuerySchema,
  listStudentsQuerySchema,
  listSubjectsQuerySchema,
  listTeachersQuerySchema,
  updateAcademicYearSchema,
  updateClassSchema,
  updateGradeSchema,
  updateStudentSchema,
  updateSubjectSchema,
  updateTeacherSchema,
  updateTermSchema,
} from '@nabta/validation';
import { PrismaService } from '../../prisma/prisma.service';
import { paginated, parsePagination } from './pagination';
import { requireSchoolId } from './school-scope';

function iso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function stamp<T extends { createdAt: Date; updatedAt: Date }>(row: T) {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: string }).code === 'P2002'
  );
}

@Injectable()
export class AcademicService {
  constructor(private readonly prisma: PrismaService) {}

  private schoolId(user: AuthUser) {
    return requireSchoolId(user);
  }

  async listYears(user: AuthUser, query: unknown) {
    const schoolId = this.schoolId(user);
    const { page, limit, skip } = parsePagination(query);
    const where = { schoolId };
    const [rows, total] = await Promise.all([
      this.prisma.academicYear.findMany({
        where,
        orderBy: { name: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.academicYear.count({ where }),
    ]);
    return paginated(
      rows.map((row) => ({
        ...stamp(row),
        startsOn: iso(row.startsOn),
        endsOn: iso(row.endsOn),
      })),
      total,
      page,
      limit,
    );
  }

  async createYear(user: AuthUser, raw: unknown) {
    const schoolId = this.schoolId(user);
    const input = createAcademicYearSchema.parse(raw);
    try {
      const row = await this.prisma.academicYear.create({
        data: {
          schoolId,
          name: input.name,
          startsOn: input.startsOn ?? undefined,
          endsOn: input.endsOn ?? undefined,
        },
      });
      return {
        ...stamp(row),
        startsOn: iso(row.startsOn),
        endsOn: iso(row.endsOn),
      };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('An academic year with that name already exists.');
      }
      throw error;
    }
  }

  async getYear(user: AuthUser, id: string) {
    const row = await this.prisma.academicYear.findFirst({
      where: { id, schoolId: this.schoolId(user) },
    });
    if (!row) throw new NotFoundException('Academic year not found.');
    return { ...stamp(row), startsOn: iso(row.startsOn), endsOn: iso(row.endsOn) };
  }

  async updateYear(user: AuthUser, id: string, raw: unknown) {
    await this.getYear(user, id);
    const input = updateAcademicYearSchema.parse(raw);
    try {
      const row = await this.prisma.academicYear.update({
        where: { id },
        data: {
          name: input.name,
          startsOn: input.startsOn === undefined ? undefined : input.startsOn,
          endsOn: input.endsOn === undefined ? undefined : input.endsOn,
        },
      });
      return { ...stamp(row), startsOn: iso(row.startsOn), endsOn: iso(row.endsOn) };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('An academic year with that name already exists.');
      }
      throw error;
    }
  }

  async deleteYear(user: AuthUser, id: string) {
    await this.getYear(user, id);
    await this.prisma.academicYear.delete({ where: { id } });
    return { ok: true };
  }

  async listTerms(user: AuthUser, academicYearId: string) {
    const year = await this.getYear(user, academicYearId);
    const rows = await this.prisma.term.findMany({
      where: { schoolId: this.schoolId(user), academicYearId: year.id },
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map((row) => ({
      ...stamp(row),
      startsOn: iso(row.startsOn),
      endsOn: iso(row.endsOn),
    }));
  }

  async createTerm(user: AuthUser, academicYearId: string, raw: unknown) {
    const schoolId = this.schoolId(user);
    await this.getYear(user, academicYearId);
    const input = createTermSchema.parse(raw);
    const existing = await this.prisma.term.count({ where: { academicYearId, schoolId } });
    if (existing >= 4) {
      throw new BadRequestException('An academic year can have at most four terms.');
    }
    const maxOrder = await this.prisma.term.aggregate({
      where: { academicYearId, schoolId },
      _max: { sortOrder: true },
    });
    const sortOrder = input.sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 1;
    try {
      const row = await this.prisma.term.create({
        data: {
          schoolId,
          academicYearId,
          name: input.name,
          startsOn: input.startsOn ?? undefined,
          endsOn: input.endsOn ?? undefined,
          sortOrder,
        },
      });
      return { ...stamp(row), startsOn: iso(row.startsOn), endsOn: iso(row.endsOn) };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('A term with that name or order already exists in this year.');
      }
      throw error;
    }
  }

  async getTerm(user: AuthUser, id: string) {
    const row = await this.prisma.term.findFirst({
      where: { id, schoolId: this.schoolId(user) },
    });
    if (!row) throw new NotFoundException('Term not found.');
    return { ...stamp(row), startsOn: iso(row.startsOn), endsOn: iso(row.endsOn) };
  }

  async updateTerm(user: AuthUser, id: string, raw: unknown) {
    await this.getTerm(user, id);
    const input = updateTermSchema.parse(raw);
    try {
      const row = await this.prisma.term.update({
        where: { id },
        data: {
          name: input.name,
          startsOn: input.startsOn === undefined ? undefined : input.startsOn,
          endsOn: input.endsOn === undefined ? undefined : input.endsOn,
          sortOrder: input.sortOrder,
        },
      });
      return { ...stamp(row), startsOn: iso(row.startsOn), endsOn: iso(row.endsOn) };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('A term with that name or order already exists in this year.');
      }
      throw error;
    }
  }

  async deleteTerm(user: AuthUser, id: string) {
    await this.getTerm(user, id);
    await this.prisma.term.delete({ where: { id } });
    return { ok: true };
  }

  async listGrades(user: AuthUser, query: unknown) {
    const schoolId = this.schoolId(user);
    const { page, limit, skip } = parsePagination(query);
    const filters = listGradesQuerySchema.parse(query ?? {});
    const where = {
      schoolId,
      ...(filters.academicYearId ? { academicYearId: filters.academicYearId } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.grade.findMany({ where, orderBy: { level: 'asc' }, skip, take: limit }),
      this.prisma.grade.count({ where }),
    ]);
    return paginated(rows.map(stamp), total, page, limit);
  }

  async createGrade(user: AuthUser, raw: unknown) {
    const schoolId = this.schoolId(user);
    const input = createGradeSchema.parse(raw);
    const year = await this.prisma.academicYear.findFirst({
      where: { id: input.academicYearId, schoolId },
    });
    if (!year) throw new NotFoundException('Academic year not found.');
    try {
      const row = await this.prisma.grade.create({
        data: {
          schoolId,
          academicYearId: input.academicYearId,
          name: input.name,
          level: input.level,
        },
      });
      return stamp(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('A grade with that level already exists in this year.');
      }
      throw error;
    }
  }

  async getGrade(user: AuthUser, id: string) {
    const row = await this.prisma.grade.findFirst({
      where: { id, schoolId: this.schoolId(user) },
    });
    if (!row) throw new NotFoundException('Grade not found.');
    return stamp(row);
  }

  async updateGrade(user: AuthUser, id: string, raw: unknown) {
    await this.getGrade(user, id);
    const input = updateGradeSchema.parse(raw);
    try {
      const row = await this.prisma.grade.update({
        where: { id },
        data: { name: input.name, level: input.level },
      });
      return stamp(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('A grade with that level already exists in this year.');
      }
      throw error;
    }
  }

  async deleteGrade(user: AuthUser, id: string) {
    await this.getGrade(user, id);
    await this.prisma.grade.delete({ where: { id } });
    return { ok: true };
  }

  async listClasses(user: AuthUser, query: unknown) {
    const schoolId = this.schoolId(user);
    const { page, limit, skip } = parsePagination(query);
    const filters = listClassesQuerySchema.parse(query ?? {});
    const where = {
      schoolId,
      ...(filters.gradeId ? { gradeId: filters.gradeId } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.schoolClass.findMany({
        where,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
        include: { grade: true },
      }),
      this.prisma.schoolClass.count({ where }),
    ]);
    return paginated(
      rows.map((row) => {
        const { grade, ...rest } = row;
        return {
          ...stamp(rest),
          gradeName: grade.name,
          academicYearId: grade.academicYearId,
        };
      }),
      total,
      page,
      limit,
    );
  }

  async createClass(user: AuthUser, raw: unknown) {
    const schoolId = this.schoolId(user);
    const input = createClassSchema.parse(raw);
    const grade = await this.prisma.grade.findFirst({
      where: { id: input.gradeId, schoolId },
    });
    if (!grade) throw new NotFoundException('Grade not found.');
    try {
      const row = await this.prisma.schoolClass.create({
        data: { schoolId, gradeId: input.gradeId, name: input.name },
      });
      return stamp(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('A class with that name already exists in this grade.');
      }
      throw error;
    }
  }

  async getClass(user: AuthUser, id: string) {
    const row = await this.prisma.schoolClass.findFirst({
      where: { id, schoolId: this.schoolId(user) },
      include: { grade: true },
    });
    if (!row) throw new NotFoundException('Class not found.');
    const { grade, ...rest } = row;
    return {
      ...stamp(rest),
      gradeName: grade.name,
      academicYearId: grade.academicYearId,
    };
  }

  async updateClass(user: AuthUser, id: string, raw: unknown) {
    await this.getClass(user, id);
    const input = updateClassSchema.parse(raw);
    try {
      const row = await this.prisma.schoolClass.update({
        where: { id },
        data: { name: input.name },
      });
      return stamp(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('A class with that name already exists in this grade.');
      }
      throw error;
    }
  }

  async deleteClass(user: AuthUser, id: string) {
    await this.getClass(user, id);
    await this.prisma.schoolClass.delete({ where: { id } });
    return { ok: true };
  }

  async listSubjects(user: AuthUser, query: unknown) {
    const schoolId = this.schoolId(user);
    const { page, limit, skip } = parsePagination(query);
    const filters = listSubjectsQuerySchema.parse(query ?? {});
    const where = {
      schoolId,
      ...(filters.gradeId ? { gradeId: filters.gradeId } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.subject.findMany({ where, orderBy: { name: 'asc' }, skip, take: limit }),
      this.prisma.subject.count({ where }),
    ]);
    return paginated(rows.map(stamp), total, page, limit);
  }

  async createSubject(user: AuthUser, raw: unknown) {
    const schoolId = this.schoolId(user);
    const input = createSubjectSchema.parse(raw);
    if (input.gradeId) {
      const grade = await this.prisma.grade.findFirst({
        where: { id: input.gradeId, schoolId },
      });
      if (!grade) throw new NotFoundException('Grade not found.');
    }
    try {
      const row = await this.prisma.subject.create({
        data: {
          schoolId,
          name: input.name,
          code: input.code ?? undefined,
          gradeId: input.gradeId ?? undefined,
        },
      });
      return stamp(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('A subject with that name already exists.');
      }
      throw error;
    }
  }

  async getSubject(user: AuthUser, id: string) {
    const row = await this.prisma.subject.findFirst({
      where: { id, schoolId: this.schoolId(user) },
    });
    if (!row) throw new NotFoundException('Subject not found.');
    return stamp(row);
  }

  async updateSubject(user: AuthUser, id: string, raw: unknown) {
    await this.getSubject(user, id);
    const input = updateSubjectSchema.parse(raw);
    if (input.gradeId) {
      const grade = await this.prisma.grade.findFirst({
        where: { id: input.gradeId, schoolId: this.schoolId(user) },
      });
      if (!grade) throw new NotFoundException('Grade not found.');
    }
    try {
      const row = await this.prisma.subject.update({
        where: { id },
        data: {
          name: input.name,
          code: input.code === undefined ? undefined : input.code,
          gradeId: input.gradeId === undefined ? undefined : input.gradeId,
        },
      });
      return stamp(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('A subject with that name already exists.');
      }
      throw error;
    }
  }

  async deleteSubject(user: AuthUser, id: string) {
    await this.getSubject(user, id);
    await this.prisma.subject.delete({ where: { id } });
    return { ok: true };
  }

  async listStudents(user: AuthUser, query: unknown) {
    const schoolId = this.schoolId(user);
    const { page, limit, skip } = parsePagination(query);
    const filters = listStudentsQuerySchema.parse(query ?? {});
    const q = filters.q?.trim();
    const where = {
      schoolId,
      ...(filters.classId ? { enrollments: { some: { classId: filters.classId } } } : {}),
      ...(filters.status ? { user: { status: filters.status } } : {}),
      ...(q && q.length >= 2
        ? {
            OR: [
              { givenName: { contains: q, mode: 'insensitive' as const } },
              { familyName: { contains: q, mode: 'insensitive' as const } },
              { user: { email: { contains: q, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        orderBy: { familyName: 'asc' },
        skip,
        take: limit,
        include: {
          user: { select: { email: true, status: true } },
          enrollments: {
            include: { class: { include: { grade: true } } },
            orderBy: { createdAt: 'asc' },
          },
        },
      }),
      this.prisma.student.count({ where }),
    ]);
    const studentIds = rows.map((row) => row.id);
    const [averages, attendance] = await Promise.all([
      this.studentAverages(schoolId, studentIds),
      this.studentAttendance(schoolId, studentIds),
    ]);
    return paginated(
      rows.map((row) => {
        const primary = row.enrollments[0];
        return {
          id: row.id,
          schoolId: row.schoolId,
          userId: row.userId,
          givenName: row.givenName,
          familyName: row.familyName,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
          email: row.user.email,
          status: row.user.status,
          classId: primary?.classId ?? null,
          className: primary?.class.name ?? null,
          gradeId: primary?.class.gradeId ?? null,
          gradeName: primary?.class.grade.name ?? null,
          attendancePercent: attendance.get(row.id) ?? null,
          average: averages.get(row.id) ?? null,
        };
      }),
      total,
      page,
      limit,
    );
  }

  async createStudent(user: AuthUser, raw: unknown) {
    const schoolId = this.schoolId(user);
    const input = createStudentSchema.parse(raw);
    const email = input.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new BadRequestException('Email is already registered.');
    const passwordHash = await argon2.hash(input.password);
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            email,
            passwordHash,
            role: UserRole.STUDENT,
            schoolId,
          },
        });
        return tx.student.create({
          data: {
            schoolId,
            userId: createdUser.id,
            givenName: input.givenName,
            familyName: input.familyName,
          },
          include: { user: { select: { email: true, status: true } } },
        });
      });
      return { ...stamp(row), email: row.user.email, status: row.user.status };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('A student profile already exists for that user.');
      }
      throw error;
    }
  }

  async getStudent(user: AuthUser, id: string) {
    const schoolId = this.schoolId(user);
    const row = await this.prisma.student.findFirst({
      where: { id, schoolId },
      include: {
        user: { select: { email: true, status: true } },
        enrollments: {
          include: { class: { include: { grade: true } } },
          orderBy: { createdAt: 'asc' },
        },
        gradeRecords: { include: { subject: true } },
      },
    });
    if (!row) throw new NotFoundException('Student not found.');
    const [averages, attendance] = await Promise.all([
      this.studentAverages(schoolId, [row.id]),
      this.studentAttendance(schoolId, [row.id]),
    ]);
    const primary = row.enrollments[0];
    return {
      id: row.id,
      schoolId: row.schoolId,
      userId: row.userId,
      givenName: row.givenName,
      familyName: row.familyName,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      email: row.user.email,
      status: row.user.status,
      classId: primary?.classId ?? null,
      className: primary?.class.name ?? null,
      gradeId: primary?.class.gradeId ?? null,
      gradeName: primary?.class.grade.name ?? null,
      attendancePercent: attendance.get(row.id) ?? null,
      average: averages.get(row.id) ?? null,
      enrollments: row.enrollments.map((enrollment) => ({
        id: enrollment.id,
        classId: enrollment.classId,
        className: enrollment.class.name,
        gradeId: enrollment.class.gradeId,
        gradeName: enrollment.class.grade.name,
      })),
      gradeRecords: row.gradeRecords.map((record) => ({
        subjectId: record.subjectId,
        subjectName: record.subject.name,
        classId: record.classId,
        percentage: Number(record.percentage),
        letter: record.letter,
      })),
    };
  }

  async updateStudent(user: AuthUser, id: string, raw: unknown) {
    const existing = await this.prisma.student.findFirst({
      where: { id, schoolId: this.schoolId(user) },
      include: { user: true },
    });
    if (!existing) throw new NotFoundException('Student not found.');
    const input = updateStudentSchema.parse(raw);
    if (input.status === 'disabled' && existing.userId === user.id) {
      throw new ForbiddenException('You cannot deactivate your own account.');
    }
    if (input.givenName || input.familyName) {
      await this.prisma.student.update({
        where: { id },
        data: {
          ...(input.givenName ? { givenName: input.givenName } : {}),
          ...(input.familyName ? { familyName: input.familyName } : {}),
        },
      });
    }
    if (input.status) {
      await this.prisma.user.update({
        where: { id: existing.userId },
        data: { status: input.status },
      });
    }
    return this.getStudent(user, id);
  }

  async listTeachers(user: AuthUser, query: unknown) {
    const schoolId = this.schoolId(user);
    const { page, limit, skip } = parsePagination(query);
    const filters = listTeachersQuerySchema.parse(query ?? {});
    const q = filters.q?.trim();
    const where = {
      schoolId,
      ...(filters.status ? { user: { status: filters.status } } : {}),
      ...(q && q.length >= 2
        ? {
            OR: [
              { givenName: { contains: q, mode: 'insensitive' as const } },
              { familyName: { contains: q, mode: 'insensitive' as const } },
              { user: { email: { contains: q, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.teacher.findMany({
        where,
        orderBy: { familyName: 'asc' },
        skip,
        take: limit,
        include: {
          user: { select: { email: true, status: true } },
          teachingAssignments: { include: { class: true, subject: true } },
        },
      }),
      this.prisma.teacher.count({ where }),
    ]);
    return paginated(
      rows.map((row) => this.mapTeacherList(row)),
      total,
      page,
      limit,
    );
  }

  async createTeacher(user: AuthUser, raw: unknown) {
    const schoolId = this.schoolId(user);
    const input = createTeacherSchema.parse(raw);
    const email = input.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new BadRequestException('Email is already registered.');
    const passwordHash = await argon2.hash(input.password);
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            email,
            passwordHash,
            role: UserRole.TEACHER,
            schoolId,
          },
        });
        return tx.teacher.create({
          data: {
            schoolId,
            userId: createdUser.id,
            givenName: input.givenName,
            familyName: input.familyName,
          },
          include: { user: { select: { email: true, status: true } } },
        });
      });
      return { ...stamp(row), email: row.user.email, status: row.user.status };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('A teacher profile already exists for that user.');
      }
      throw error;
    }
  }

  async getTeacher(user: AuthUser, id: string) {
    const row = await this.prisma.teacher.findFirst({
      where: { id, schoolId: this.schoolId(user) },
      include: {
        user: { select: { email: true, status: true } },
        teachingAssignments: { include: { class: true, subject: true } },
      },
    });
    if (!row) throw new NotFoundException('Teacher not found.');
    const list = this.mapTeacherList(row);
    return {
      ...list,
      userId: row.userId,
      assignments: row.teachingAssignments.map((assignment) => ({
        id: assignment.id,
        classId: assignment.classId,
        className: assignment.class.name,
        subjectId: assignment.subjectId,
        subjectName: assignment.subject.name,
      })),
    };
  }

  async updateTeacher(user: AuthUser, id: string, raw: unknown) {
    const existing = await this.prisma.teacher.findFirst({
      where: { id, schoolId: this.schoolId(user) },
      include: { user: true },
    });
    if (!existing) throw new NotFoundException('Teacher not found.');
    const input = updateTeacherSchema.parse(raw);
    if (input.status === 'disabled' && existing.userId === user.id) {
      throw new ForbiddenException('You cannot deactivate your own account.');
    }
    if (input.givenName || input.familyName) {
      await this.prisma.teacher.update({
        where: { id },
        data: {
          ...(input.givenName ? { givenName: input.givenName } : {}),
          ...(input.familyName ? { familyName: input.familyName } : {}),
        },
      });
    }
    if (input.status) {
      await this.prisma.user.update({
        where: { id: existing.userId },
        data: { status: input.status },
      });
    }
    return this.getTeacher(user, id);
  }

  async listEnrollments(user: AuthUser, classId: string) {
    const schoolId = this.schoolId(user);
    await this.getClass(user, classId);
    const rows = await this.prisma.enrollment.findMany({
      where: { classId, schoolId },
      orderBy: { createdAt: 'asc' },
      include: { student: true },
    });
    return rows.map((row) => ({
      ...stamp(row),
      student: stamp(row.student),
    }));
  }

  async enrollStudent(user: AuthUser, classId: string, raw: unknown) {
    const schoolId = this.schoolId(user);
    await this.getClass(user, classId);
    const input = createEnrollmentSchema.parse(raw);
    const student = await this.prisma.student.findFirst({
      where: { id: input.studentId, schoolId },
    });
    if (!student) throw new NotFoundException('Student not found.');
    try {
      const row = await this.prisma.enrollment.create({
        data: { schoolId, classId, studentId: input.studentId },
        include: { student: true },
      });
      return { ...stamp(row), student: stamp(row.student) };
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('That student is already enrolled in this class.');
      }
      throw error;
    }
  }

  async createTeachingAssignment(user: AuthUser, raw: unknown) {
    const schoolId = this.schoolId(user);
    const input = createTeachingAssignmentSchema.parse(raw);
    const [teacher, subject, schoolClass] = await Promise.all([
      this.prisma.teacher.findFirst({ where: { id: input.teacherId, schoolId } }),
      this.prisma.subject.findFirst({ where: { id: input.subjectId, schoolId } }),
      this.prisma.schoolClass.findFirst({ where: { id: input.classId, schoolId } }),
    ]);
    if (!teacher) throw new NotFoundException('Teacher not found.');
    if (!subject) throw new NotFoundException('Subject not found.');
    if (!schoolClass) throw new NotFoundException('Class not found.');
    try {
      const row = await this.prisma.teachingAssignment.create({
        data: {
          schoolId,
          teacherId: input.teacherId,
          subjectId: input.subjectId,
          classId: input.classId,
        },
      });
      return stamp(row);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new BadRequestException('That teaching assignment already exists.');
      }
      throw error;
    }
  }

  async listTeachingAssignments(user: AuthUser, classId: string) {
    const schoolId = this.schoolId(user);
    await this.getClass(user, classId);
    const rows = await this.prisma.teachingAssignment.findMany({
      where: { classId, schoolId },
      orderBy: { createdAt: 'asc' },
      include: { teacher: true, subject: true },
    });
    return rows.map((row) => ({
      ...stamp(row),
      teacher: stamp(row.teacher),
      subject: stamp(row.subject),
    }));
  }

  async unenrollStudent(user: AuthUser, classId: string, enrollmentId: string) {
    const schoolId = this.schoolId(user);
    await this.getClass(user, classId);
    const row = await this.prisma.enrollment.findFirst({
      where: { id: enrollmentId, classId, schoolId },
    });
    if (!row) throw new NotFoundException('Enrollment not found.');
    await this.prisma.enrollment.delete({ where: { id: enrollmentId } });
    return { ok: true };
  }

  async deleteTeachingAssignment(user: AuthUser, id: string) {
    const row = await this.prisma.teachingAssignment.findFirst({
      where: { id, schoolId: this.schoolId(user) },
    });
    if (!row) throw new NotFoundException('Teaching assignment not found.');
    await this.prisma.teachingAssignment.delete({ where: { id } });
    return { ok: true };
  }

  private mapTeacherList(row: {
    id: string;
    schoolId: string;
    userId: string;
    givenName: string;
    familyName: string;
    createdAt: Date;
    updatedAt: Date;
    user: { email: string; status: string };
    teachingAssignments: {
      class: { name: string };
      subject: { name: string };
    }[];
  }) {
    return {
      id: row.id,
      schoolId: row.schoolId,
      userId: row.userId,
      givenName: row.givenName,
      familyName: row.familyName,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      email: row.user.email,
      status: row.user.status,
      classes: [...new Set(row.teachingAssignments.map((item) => item.class.name))],
      subjects: [...new Set(row.teachingAssignments.map((item) => item.subject.name))],
    };
  }

  private async studentAverages(schoolId: string, studentIds: string[]) {
    const map = new Map<string, number>();
    if (studentIds.length === 0) return map;
    const rows = await this.prisma.gradeRecord.findMany({
      where: { schoolId, studentId: { in: studentIds } },
      select: { studentId: true, percentage: true },
    });
    const buckets = new Map<string, number[]>();
    for (const row of rows) {
      const list = buckets.get(row.studentId) ?? [];
      list.push(Number(row.percentage));
      buckets.set(row.studentId, list);
    }
    for (const [studentId, values] of buckets) {
      map.set(studentId, Math.round(values.reduce((sum, value) => sum + value, 0) / values.length));
    }
    return map;
  }

  private async studentAttendance(schoolId: string, studentIds: string[]) {
    const map = new Map<string, number>();
    if (studentIds.length === 0) return map;
    const records = await this.prisma.attendanceRecord.findMany({
      where: { schoolId, studentId: { in: studentIds } },
      select: { studentId: true, status: true },
    });
    const counted = new Map<string, { present: number; total: number }>();
    for (const record of records) {
      const bucket = counted.get(record.studentId) ?? { present: 0, total: 0 };
      bucket.total += 1;
      if (record.status === 'PRESENT' || record.status === 'LATE') bucket.present += 1;
      counted.set(record.studentId, bucket);
    }
    for (const [studentId, bucket] of counted) {
      if (bucket.total === 0) continue;
      map.set(studentId, Math.round((bucket.present / bucket.total) * 100));
    }
    return map;
  }
}
