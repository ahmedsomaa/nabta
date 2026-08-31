import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AuthUser, StudentAssignmentStatus } from '@nabta/types';
import {
  assignmentFileSchema,
  attendanceQuerySchema,
  createLessonSchema,
  createTeacherAssignmentSchema,
  createUnitSchema,
  gradebookQuerySchema,
  gradeSubmissionSchema,
  lessonMaterialSchema,
  putAttendanceSchema,
  reorderLessonsSchema,
  reorderUnitsSchema,
  teacherFilePresignSchema,
  updateLessonSchema,
  updateTeacherAssignmentSchema,
  updateUnitSchema,
} from '@nabta/validation';
import { PrismaService } from '../../prisma/prisma.service';
import { requireSchoolId } from '../academic/school-scope';
import { STORAGE_SERVICE, type StorageService } from '../storage/storage.service';
import { GradeRecordService } from '../assessments/grade-record.service';

const ALLOWED_MIME = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const MIME_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'text/plain': 'txt',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

function parseDateOnly(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
}

function scoreNumber(value: { toString(): string } | number | null | undefined): number | null {
  if (value == null) return null;
  return Number(value);
}

@Injectable()
export class TeacherService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
    @Optional() private readonly grades?: GradeRecordService,
  ) {}

  private schoolId(user: AuthUser) {
    return requireSchoolId(user);
  }

  private async requireTeacher(user: AuthUser) {
    const schoolId = this.schoolId(user);
    const teacher = await this.prisma.teacher.findFirst({
      where: { userId: user.id, schoolId },
      include: { teachingAssignments: true },
    });
    if (!teacher) {
      throw new ForbiddenException('No teacher profile is linked to this account.');
    }
    return teacher;
  }

  private async assertTeaching(
    teacher: { id: string; schoolId: string },
    classId: string,
    subjectId: string,
  ) {
    const row = await this.prisma.teachingAssignment.findFirst({
      where: { teacherId: teacher.id, schoolId: teacher.schoolId, classId, subjectId },
    });
    if (!row) throw new NotFoundException('Class not found.');
    return row;
  }

  async getMe(user: AuthUser) {
    const teacher = await this.requireTeacher(user);
    return {
      id: teacher.id,
      givenName: teacher.givenName,
      familyName: teacher.familyName,
    };
  }

  async getDashboard(user: AuthUser) {
    const teacher = await this.requireTeacher(user);
    const pairs = teacher.teachingAssignments;
    if (pairs.length === 0) {
      return { schedule: [], toGrade: [], alerts: [] };
    }
    const weekday = new Date().getDay();
    const or =
      pairs.length === 0
        ? [{ classId: '00000000-0000-4000-8000-000000000000' }]
        : pairs.map((row) => ({ classId: row.classId, subjectId: row.subjectId }));

    const [slots, assignments] = await Promise.all([
      this.prisma.timetableSlot.findMany({
        where: { schoolId: teacher.schoolId, weekday, OR: or },
        include: { subject: true, class: true },
        orderBy: { startsAt: 'asc' },
      }),
      this.prisma.assignment.findMany({
        where: { schoolId: teacher.schoolId, OR: or, publishedAt: { not: null } },
        include: {
          class: true,
          subject: true,
          submissions: { where: { status: { in: ['SUBMITTED', 'LATE'] } } },
        },
        orderBy: { dueAt: 'asc' },
      }),
    ]);

    const toGrade = assignments
      .map((row) => ({
        assignmentId: row.id,
        title: row.title,
        pending: row.submissions.length,
        classId: row.classId,
        className: row.class.name,
        subjectId: row.subjectId,
        subjectName: row.subject.name,
      }))
      .filter((row) => row.pending > 0);

    const alerts = await this.buildAlerts(teacher.schoolId, pairs);

    return {
      schedule: slots.map((slot) => ({
        id: slot.id,
        weekday: slot.weekday,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        room: slot.room,
        classId: slot.classId,
        className: slot.class.name,
        subjectId: slot.subjectId,
        subjectName: slot.subject.name,
      })),
      toGrade,
      alerts,
    };
  }

  private async buildAlerts(
    schoolId: string,
    pairs: { classId: string; subjectId: string }[],
  ) {
    const alerts: {
      kind: 'missing_work' | 'low_progress' | 'low_score';
      message: string;
      classId: string;
      subjectId: string;
    }[] = [];

    for (const pair of pairs) {
      const roster = await this.rosterRows(schoolId, pair.classId, pair.subjectId);
      const missing = roster.filter((row) => row.missingWork > 0).length;
      const behind = roster.filter((row) => row.progressPercent < 50).length;
      if (missing > 0) {
        alerts.push({
          kind: 'missing_work',
          message: `${missing} student${missing === 1 ? '' : 's'} missing work`,
          classId: pair.classId,
          subjectId: pair.subjectId,
        });
      }
      if (behind > 0) {
        alerts.push({
          kind: 'low_progress',
          message: `${behind} student${behind === 1 ? '' : 's'} below 50% lesson progress`,
          classId: pair.classId,
          subjectId: pair.subjectId,
        });
      }
      const quizzes = await this.prisma.assessment.findMany({
        where: {
          schoolId,
          classId: pair.classId,
          subjectId: pair.subjectId,
          publishedAt: { not: null },
        },
        include: {
          attempts: { where: { status: { in: ['SUBMITTED', 'EXPIRED'] } } },
          questions: { select: { points: true } },
        },
      });
      let lowScore = 0;
      for (const quiz of quizzes) {
        const maxScore = quiz.questions.reduce((sum, question) => sum + question.points, 0);
        if (maxScore <= 0) continue;
        const byStudent = new Map<string, number>();
        for (const attempt of quiz.attempts) {
          const value = Number(attempt.score ?? 0);
          const current = byStudent.get(attempt.studentId);
          if (current == null || value > current) byStudent.set(attempt.studentId, value);
        }
        for (const score of byStudent.values()) {
          if ((score / maxScore) * 100 < quiz.passingScore) lowScore += 1;
        }
      }
      if (lowScore > 0) {
        alerts.push({
          kind: 'low_score',
          message: `${lowScore} quiz score${lowScore === 1 ? '' : 's'} below passing`,
          classId: pair.classId,
          subjectId: pair.subjectId,
        });
      }
    }
    return alerts;
  }

  async listClasses(user: AuthUser) {
    const teacher = await this.requireTeacher(user);
    const rows = await this.prisma.teachingAssignment.findMany({
      where: { teacherId: teacher.id, schoolId: teacher.schoolId },
      include: { class: true, subject: true },
      orderBy: [{ class: { name: 'asc' } }, { subject: { name: 'asc' } }],
    });
    return rows.map((row) => ({
      classId: row.classId,
      className: row.class.name,
      subjectId: row.subjectId,
      subjectName: row.subject.name,
    }));
  }

  async getClassSubject(user: AuthUser, classId: string, subjectId: string) {
    const teacher = await this.requireTeacher(user);
    await this.assertTeaching(teacher, classId, subjectId);
    const [klass, subject, units, assignments] = await Promise.all([
      this.prisma.schoolClass.findFirst({ where: { id: classId, schoolId: teacher.schoolId } }),
      this.prisma.subject.findFirst({ where: { id: subjectId, schoolId: teacher.schoolId } }),
      this.prisma.unit.findMany({
        where: { schoolId: teacher.schoolId, subjectId, classId },
        orderBy: { sortOrder: 'asc' },
        include: { lessons: { orderBy: { sortOrder: 'asc' } } },
      }),
      this.prisma.assignment.findMany({
        where: { schoolId: teacher.schoolId, classId, subjectId },
        include: {
          class: true,
          subject: true,
          submissions: { where: { status: { in: ['SUBMITTED', 'LATE'] } } },
        },
        orderBy: { dueAt: 'asc' },
      }),
    ]);
    if (!klass || !subject) throw new NotFoundException('Class not found.');
    return {
      classId,
      className: klass.name,
      subjectId,
      subjectName: subject.name,
      units: units.map((unit) => ({
        id: unit.id,
        title: unit.title,
        sortOrder: unit.sortOrder,
        lessons: unit.lessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          type: lesson.type,
          sortOrder: lesson.sortOrder,
          publishedAt: lesson.publishedAt?.toISOString() ?? null,
        })),
      })),
      assignments: assignments.map((row) => this.mapAssignmentList(row)),
    };
  }

  async getRoster(user: AuthUser, classId: string, subjectId: string) {
    const teacher = await this.requireTeacher(user);
    await this.assertTeaching(teacher, classId, subjectId);
    return this.rosterRows(teacher.schoolId, classId, subjectId);
  }

  private async rosterRows(schoolId: string, classId: string, subjectId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { schoolId, classId },
      include: { student: true },
      orderBy: [{ student: { familyName: 'asc' } }, { student: { givenName: 'asc' } }],
    });
    const publishedLessons = await this.prisma.lesson.findMany({
      where: {
        schoolId,
        publishedAt: { not: null },
        unit: { subjectId, classId },
      },
      select: { id: true },
    });
    const lessonIds = publishedLessons.map((row) => row.id);
    const studentIds = enrollments.map((row) => row.studentId);
    const percents = await this.hydrateProgress(schoolId, studentIds, lessonIds);
    const publishedAssignments = await this.prisma.assignment.findMany({
      where: { schoolId, classId, subjectId, publishedAt: { not: null } },
      include: { submissions: true },
    });
    const sessions = await this.prisma.attendanceSession.findMany({
      where: { schoolId, classId, subjectId },
      include: { records: true },
    });

    return enrollments.map((enrollment) => {
      const studentId = enrollment.studentId;
      return {
        studentId,
        givenName: enrollment.student.givenName,
        familyName: enrollment.student.familyName,
        progressPercent: percents.get(studentId) ?? 0,
        attendancePercent: this.attendancePercent(studentId, sessions),
        average: this.assignmentAverage(studentId, publishedAssignments),
        missingWork: this.missingWork(studentId, publishedAssignments),
      };
    });
  }

  private async hydrateProgress(
    schoolId: string,
    studentIds: string[],
    lessonIds: string[],
  ) {
    if (lessonIds.length === 0 || studentIds.length === 0) return new Map<string, number>();
    const rows = await this.prisma.lessonProgress.findMany({
      where: {
        schoolId,
        studentId: { in: studentIds },
        lessonId: { in: lessonIds },
        completedAt: { not: null },
      },
      select: { studentId: true, lessonId: true },
    });
    const done = new Map<string, Set<string>>();
    for (const row of rows) {
      const set = done.get(row.studentId) ?? new Set<string>();
      set.add(row.lessonId);
      done.set(row.studentId, set);
    }
    const percents = new Map<string, number>();
    for (const studentId of studentIds) {
      const count = done.get(studentId)?.size ?? 0;
      percents.set(studentId, Math.round((count / lessonIds.length) * 100));
    }
    return percents;
  }

  private attendancePercent(
    studentId: string,
    sessions: { records: { studentId: string; status: string }[] }[],
  ) {
    if (sessions.length === 0) return null;
    let present = 0;
    let counted = 0;
    for (const session of sessions) {
      const record = session.records.find((row) => row.studentId === studentId);
      if (!record) continue;
      counted += 1;
      if (record.status === 'PRESENT' || record.status === 'LATE') present += 1;
    }
    if (counted === 0) return null;
    return Math.round((present / counted) * 100);
  }

  private assignmentAverage(
    studentId: string,
    assignments: {
      maxScore: number;
      submissions: {
        studentId: string;
        score: { toString(): string } | number | null;
        gradesPublishedAt: Date | null;
      }[];
    }[],
  ) {
    const scores: number[] = [];
    for (const assignment of assignments) {
      const submission = assignment.submissions.find((row) => row.studentId === studentId);
      if (!submission?.gradesPublishedAt || submission.score == null) continue;
      const max = assignment.maxScore || 100;
      scores.push((Number(submission.score) / max) * 100);
    }
    if (scores.length === 0) return null;
    return Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
  }

  private missingWork(
    studentId: string,
    assignments: {
      submissions: { studentId: string; status: string }[];
    }[],
  ) {
    let missing = 0;
    for (const assignment of assignments) {
      const submission = assignment.submissions.find((row) => row.studentId === studentId);
      const done =
        submission &&
        ['SUBMITTED', 'LATE', 'GRADED', 'RETURNED'].includes(submission.status);
      if (!done) missing += 1;
    }
    return missing;
  }

  async getStudentOverview(user: AuthUser, classId: string, subjectId: string, studentId: string) {
    const teacher = await this.requireTeacher(user);
    await this.assertTeaching(teacher, classId, subjectId);
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { schoolId: teacher.schoolId, classId, studentId },
      include: { student: true },
    });
    if (!enrollment) throw new NotFoundException('Student not found.');

    const lessons = await this.prisma.lesson.findMany({
      where: {
        schoolId: teacher.schoolId,
        publishedAt: { not: null },
        unit: { subjectId, classId },
      },
      orderBy: { sortOrder: 'asc' },
    });
    const progress = await this.prisma.lessonProgress.findMany({
      where: { studentId, completedAt: { not: null } },
      select: { lessonId: true },
    });
    const done = new Set(progress.map((row) => row.lessonId));
    const assignments = await this.prisma.assignment.findMany({
      where: { schoolId: teacher.schoolId, classId, subjectId, publishedAt: { not: null } },
      include: { submissions: { where: { studentId } } },
      orderBy: { dueAt: 'asc' },
    });

    return {
      studentId,
      givenName: enrollment.student.givenName,
      familyName: enrollment.student.familyName,
      lessons: lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        completed: done.has(lesson.id),
      })),
      assignments: assignments.map((row) => {
        const submission = row.submissions[0] ?? null;
        const status: StudentAssignmentStatus = submission
          ? submission.gradesPublishedAt
            ? 'RETURNED'
            : (submission.status as StudentAssignmentStatus)
          : 'NOT_STARTED';
        return {
          id: row.id,
          title: row.title,
          status: status === 'GRADED' ? 'SUBMITTED' : status,
          score:
            submission?.gradesPublishedAt && submission.score != null
              ? Number(submission.score)
              : null,
        };
      }),
    };
  }

  async presign(user: AuthUser, body: unknown) {
    const input = teacherFilePresignSchema.parse(body);
    if (!ALLOWED_MIME.has(input.mimeType)) {
      throw new BadRequestException('This file type is not allowed.');
    }
    const teacher = await this.requireTeacher(user);
    const ext = MIME_EXT[input.mimeType] ?? 'bin';
    let storageKey: string;
    if (input.purpose === 'material') {
      const lesson = await this.requireLesson(teacher, input.lessonId);
      storageKey = `${teacher.schoolId}/materials/${lesson.unit.subjectId}/${lesson.id}/${randomUUID()}.${ext}`;
    } else {
      const assignment = await this.requireAssignment(teacher, input.assignmentId);
      storageKey = `${teacher.schoolId}/assignments/${assignment.id}/${randomUUID()}.${ext}`;
    }
    const uploadUrl = await this.storage.getUploadUrl(storageKey);
    return { storageKey, uploadUrl };
  }

  async createUnit(user: AuthUser, body: unknown) {
    const input = createUnitSchema.parse(body);
    const teacher = await this.requireTeacher(user);
    await this.assertTeaching(teacher, input.classId, input.subjectId);
    const last = await this.prisma.unit.findFirst({
      where: { schoolId: teacher.schoolId, subjectId: input.subjectId, classId: input.classId },
      orderBy: { sortOrder: 'desc' },
    });
    return this.prisma.unit.create({
      data: {
        schoolId: teacher.schoolId,
        subjectId: input.subjectId,
        classId: input.classId,
        title: input.title,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    });
  }

  async updateUnit(user: AuthUser, id: string, body: unknown) {
    const input = updateUnitSchema.parse(body);
    const teacher = await this.requireTeacher(user);
    const unit = await this.requireUnit(teacher, id);
    return this.prisma.unit.update({ where: { id: unit.id }, data: { title: input.title } });
  }

  async deleteUnit(user: AuthUser, id: string) {
    const teacher = await this.requireTeacher(user);
    const unit = await this.requireUnit(teacher, id);
    await this.prisma.unit.delete({ where: { id: unit.id } });
    return { ok: true };
  }

  async reorderUnits(user: AuthUser, body: unknown) {
    const input = reorderUnitsSchema.parse(body);
    const teacher = await this.requireTeacher(user);
    await this.assertTeaching(teacher, input.classId, input.subjectId);
    const units = await this.prisma.unit.findMany({
      where: { schoolId: teacher.schoolId, subjectId: input.subjectId, classId: input.classId },
    });
    const allowed = new Set(units.map((row) => row.id));
    if (input.ids.length !== allowed.size || input.ids.some((id) => !allowed.has(id))) {
      throw new BadRequestException('Invalid unit order.');
    }
    await this.prisma.$transaction(
      input.ids.map((id, index) => this.prisma.unit.update({ where: { id }, data: { sortOrder: index } })),
    );
    return { ok: true };
  }

  async createLesson(user: AuthUser, body: unknown) {
    const input = createLessonSchema.parse(body);
    const teacher = await this.requireTeacher(user);
    const unit = await this.requireUnit(teacher, input.unitId);
    const last = await this.prisma.lesson.findFirst({
      where: { unitId: unit.id },
      orderBy: { sortOrder: 'desc' },
    });
    return this.prisma.lesson.create({
      data: {
        schoolId: teacher.schoolId,
        unitId: unit.id,
        title: input.title,
        type: input.type,
        body: input.body ?? null,
        url: input.url || null,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    });
  }

  async getLesson(user: AuthUser, id: string) {
    const teacher = await this.requireTeacher(user);
    const lesson = await this.requireLesson(teacher, id);
    return {
      id: lesson.id,
      unitId: lesson.unitId,
      title: lesson.title,
      type: lesson.type,
      body: lesson.body,
      url: lesson.url,
      publishedAt: lesson.publishedAt?.toISOString() ?? null,
      sortOrder: lesson.sortOrder,
      materials: lesson.materials.map((row) => ({
        id: row.id,
        fileName: row.fileName,
        mimeType: row.mimeType,
        size: row.size,
      })),
    };
  }

  async updateLesson(user: AuthUser, id: string, body: unknown) {
    const input = updateLessonSchema.parse(body);
    const teacher = await this.requireTeacher(user);
    const lesson = await this.requireLesson(teacher, id);
    return this.prisma.lesson.update({
      where: { id: lesson.id },
      data: {
        ...(input.title != null ? { title: input.title } : {}),
        ...(input.type != null ? { type: input.type } : {}),
        ...(input.body !== undefined ? { body: input.body } : {}),
        ...(input.url !== undefined ? { url: input.url || null } : {}),
      },
    });
  }

  async deleteLesson(user: AuthUser, id: string) {
    const teacher = await this.requireTeacher(user);
    const lesson = await this.requireLesson(teacher, id);
    await this.prisma.lesson.delete({ where: { id: lesson.id } });
    return { ok: true };
  }

  async reorderLessons(user: AuthUser, body: unknown) {
    const input = reorderLessonsSchema.parse(body);
    const teacher = await this.requireTeacher(user);
    await this.requireUnit(teacher, input.unitId);
    const lessons = await this.prisma.lesson.findMany({ where: { unitId: input.unitId } });
    const allowed = new Set(lessons.map((row) => row.id));
    if (input.ids.length !== allowed.size || input.ids.some((id) => !allowed.has(id))) {
      throw new BadRequestException('Invalid lesson order.');
    }
    await this.prisma.$transaction(
      input.ids.map((id, index) =>
        this.prisma.lesson.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );
    return { ok: true };
  }

  async publishLesson(user: AuthUser, id: string) {
    const teacher = await this.requireTeacher(user);
    const lesson = await this.requireLesson(teacher, id);
    return this.prisma.lesson.update({
      where: { id: lesson.id },
      data: { publishedAt: lesson.publishedAt ?? new Date() },
    });
  }

  async unpublishLesson(user: AuthUser, id: string) {
    const teacher = await this.requireTeacher(user);
    const lesson = await this.requireLesson(teacher, id);
    return this.prisma.lesson.update({
      where: { id: lesson.id },
      data: { publishedAt: null },
    });
  }

  async addMaterial(user: AuthUser, lessonId: string, body: unknown) {
    const input = lessonMaterialSchema.parse(body);
    const teacher = await this.requireTeacher(user);
    const lesson = await this.requireLesson(teacher, lessonId);
    const prefix = `${teacher.schoolId}/materials/${lesson.unit.subjectId}/${lesson.id}/`;
    if (!input.storageKey.startsWith(prefix)) {
      throw new BadRequestException('Invalid file key.');
    }
    if (!ALLOWED_MIME.has(input.mimeType)) {
      throw new BadRequestException('This file type is not allowed.');
    }
    return this.prisma.learningMaterial.create({
      data: {
        schoolId: teacher.schoolId,
        lessonId: lesson.id,
        storageKey: input.storageKey,
        fileName: input.fileName,
        mimeType: input.mimeType,
        size: input.size,
      },
    });
  }

  async listAssignments(user: AuthUser) {
    const teacher = await this.requireTeacher(user);
    const pairs = teacher.teachingAssignments;
    if (pairs.length === 0) return [];
    const rows = await this.prisma.assignment.findMany({
      where: {
        schoolId: teacher.schoolId,
        OR: pairs.map((row) => ({ classId: row.classId, subjectId: row.subjectId })),
      },
      include: {
        class: true,
        subject: true,
        submissions: { where: { status: { in: ['SUBMITTED', 'LATE'] } } },
      },
      orderBy: { dueAt: 'asc' },
    });
    return rows.map((row) => this.mapAssignmentList(row));
  }

  async createAssignment(user: AuthUser, body: unknown) {
    const input = createTeacherAssignmentSchema.parse(body);
    const teacher = await this.requireTeacher(user);
    await this.assertTeaching(teacher, input.classId, input.subjectId);
    const row = await this.prisma.assignment.create({
      data: {
        schoolId: teacher.schoolId,
        classId: input.classId,
        subjectId: input.subjectId,
        title: input.title,
        instructions: input.instructions,
        dueAt: input.dueAt,
        maxScore: input.maxScore ?? 100,
      },
      include: { class: true, subject: true, files: true },
    });
    return this.mapAssignmentDetail(row);
  }

  async getAssignment(user: AuthUser, id: string) {
    const teacher = await this.requireTeacher(user);
    const row = await this.requireAssignment(teacher, id);
    return this.mapAssignmentDetail(row);
  }

  async updateAssignment(user: AuthUser, id: string, body: unknown) {
    const input = updateTeacherAssignmentSchema.parse(body);
    const teacher = await this.requireTeacher(user);
    const row = await this.requireAssignment(teacher, id);
    const updated = await this.prisma.assignment.update({
      where: { id: row.id },
      data: {
        ...(input.title != null ? { title: input.title } : {}),
        ...(input.instructions != null ? { instructions: input.instructions } : {}),
        ...(input.dueAt != null ? { dueAt: input.dueAt } : {}),
        ...(input.maxScore != null ? { maxScore: input.maxScore } : {}),
      },
      include: { class: true, subject: true, files: true },
    });
    return this.mapAssignmentDetail(updated);
  }

  async publishAssignment(user: AuthUser, id: string) {
    const teacher = await this.requireTeacher(user);
    const row = await this.requireAssignment(teacher, id);
    const updated = await this.prisma.assignment.update({
      where: { id: row.id },
      data: { publishedAt: row.publishedAt ?? new Date() },
      include: { class: true, subject: true, files: true },
    });
    return this.mapAssignmentDetail(updated);
  }

  async unpublishAssignment(user: AuthUser, id: string) {
    const teacher = await this.requireTeacher(user);
    const row = await this.requireAssignment(teacher, id);
    const updated = await this.prisma.assignment.update({
      where: { id: row.id },
      data: { publishedAt: null },
      include: { class: true, subject: true, files: true },
    });
    return this.mapAssignmentDetail(updated);
  }

  async addAssignmentFile(user: AuthUser, assignmentId: string, body: unknown) {
    const input = assignmentFileSchema.parse(body);
    const teacher = await this.requireTeacher(user);
    const assignment = await this.requireAssignment(teacher, assignmentId);
    const prefix = `${teacher.schoolId}/assignments/${assignment.id}/`;
    if (!input.storageKey.startsWith(prefix)) {
      throw new BadRequestException('Invalid file key.');
    }
    if (!ALLOWED_MIME.has(input.mimeType)) {
      throw new BadRequestException('This file type is not allowed.');
    }
    await this.prisma.assignmentFile.create({
      data: {
        schoolId: teacher.schoolId,
        assignmentId: assignment.id,
        storageKey: input.storageKey,
        fileName: input.fileName,
        mimeType: input.mimeType,
        size: input.size,
      },
    });
    return this.getAssignment(user, assignmentId);
  }

  async listSubmissions(user: AuthUser, assignmentId: string) {
    const teacher = await this.requireTeacher(user);
    const assignment = await this.requireAssignment(teacher, assignmentId);
    const enrollments = await this.prisma.enrollment.findMany({
      where: { schoolId: teacher.schoolId, classId: assignment.classId },
      include: { student: true },
      orderBy: [{ student: { familyName: 'asc' } }, { student: { givenName: 'asc' } }],
    });
    const submissions = await this.prisma.assignmentSubmission.findMany({
      where: { assignmentId: assignment.id },
    });
    const byStudent = new Map(submissions.map((row) => [row.studentId, row]));
    return enrollments.map((enrollment) => {
      const submission = byStudent.get(enrollment.studentId);
      return {
        id: submission?.id ?? null,
        studentId: enrollment.studentId,
        givenName: enrollment.student.givenName,
        familyName: enrollment.student.familyName,
        status: (submission?.status ?? 'NOT_STARTED') as StudentAssignmentStatus,
        submittedAt: submission?.submittedAt?.toISOString() ?? null,
        score: scoreNumber(submission?.score),
        gradesPublishedAt: submission?.gradesPublishedAt?.toISOString() ?? null,
      };
    });
  }

  async getSubmission(user: AuthUser, id: string) {
    const teacher = await this.requireTeacher(user);
    const submission = await this.prisma.assignmentSubmission.findFirst({
      where: { id, schoolId: teacher.schoolId },
      include: {
        student: true,
        files: true,
        assignment: { include: { class: true, subject: true } },
      },
    });
    if (!submission) throw new NotFoundException('Submission not found.');
    await this.assertTeaching(teacher, submission.assignment.classId, submission.assignment.subjectId);
    const files = await Promise.all(
      submission.files.map(async (file) => ({
        id: file.id,
        fileName: file.fileName,
        mimeType: file.mimeType,
        size: file.size,
        downloadUrl: await this.storage.getObjectUrl(file.storageKey),
      })),
    );
    return {
      id: submission.id,
      assignmentId: submission.assignmentId,
      assignmentTitle: submission.assignment.title,
      maxScore: submission.assignment.maxScore,
      studentId: submission.studentId,
      givenName: submission.student.givenName,
      familyName: submission.student.familyName,
      status: submission.status,
      submittedAt: submission.submittedAt?.toISOString() ?? null,
      score: scoreNumber(submission.score),
      feedback: submission.feedback,
      gradesPublishedAt: submission.gradesPublishedAt?.toISOString() ?? null,
      files,
    };
  }

  async gradeSubmission(user: AuthUser, id: string, body: unknown) {
    const input = gradeSubmissionSchema.parse(body);
    const teacher = await this.requireTeacher(user);
    const current = await this.getSubmission(user, id);
    if (input.score > current.maxScore) {
      throw new BadRequestException('Score cannot exceed the assignment maximum.');
    }
    if (!['SUBMITTED', 'LATE', 'GRADED', 'RETURNED'].includes(current.status)) {
      throw new BadRequestException('This submission is not ready to grade.');
    }
    await this.prisma.assignmentSubmission.update({
      where: { id },
      data: {
        score: input.score,
        feedback: input.feedback ?? null,
        gradedAt: new Date(),
        status: 'GRADED',
        schoolId: teacher.schoolId,
      },
    });
    return this.getSubmission(user, id);
  }

  async publishGrades(user: AuthUser, assignmentId: string) {
    const teacher = await this.requireTeacher(user);
    const assignment = await this.requireAssignment(teacher, assignmentId);
    await this.prisma.assignmentSubmission.updateMany({
      where: { assignmentId: assignment.id, status: 'GRADED' },
      data: { gradesPublishedAt: new Date(), status: 'RETURNED' },
    });
    const published = await this.prisma.assignmentSubmission.findMany({
      where: { assignmentId: assignment.id, gradesPublishedAt: { not: null } },
      select: { studentId: true },
    });
    if (this.grades) {
      await this.grades.recomputeForAssignment(
        teacher.schoolId,
        assignment.classId,
        assignment.subjectId,
        [...new Set(published.map((row) => row.studentId))],
      );
    }
    return this.listSubmissions(user, assignmentId);
  }

  async getGradebook(user: AuthUser, query: unknown) {
    const input = gradebookQuerySchema.parse(query);
    const teacher = await this.requireTeacher(user);
    await this.assertTeaching(teacher, input.classId, input.subjectId);
    const enrollments = await this.prisma.enrollment.findMany({
      where: { schoolId: teacher.schoolId, classId: input.classId },
      include: { student: true },
      orderBy: [{ student: { familyName: 'asc' } }, { student: { givenName: 'asc' } }],
    });
    const assignments = await this.prisma.assignment.findMany({
      where: { schoolId: teacher.schoolId, classId: input.classId, subjectId: input.subjectId },
      include: { submissions: true },
      orderBy: { dueAt: 'asc' },
    });
    const assessments = await this.prisma.assessment.findMany({
      where: {
        schoolId: teacher.schoolId,
        classId: input.classId,
        subjectId: input.subjectId,
        publishedAt: { not: null },
      },
      include: { attempts: true, questions: { select: { points: true } } },
      orderBy: { createdAt: 'asc' },
    });
    const cells = enrollments.flatMap((enrollment) =>
      assignments.map((assignment) => {
        const submission = assignment.submissions.find((row) => row.studentId === enrollment.studentId);
        const status: StudentAssignmentStatus = submission
          ? (submission.status as StudentAssignmentStatus)
          : 'NOT_STARTED';
        return {
          studentId: enrollment.studentId,
          assignmentId: assignment.id,
          score: scoreNumber(submission?.score),
          status,
        };
      }),
    );
    const assessmentCells = enrollments.flatMap((enrollment) =>
      assessments.map((assessment) => {
        const attempts = assessment.attempts.filter(
          (row) =>
            row.studentId === enrollment.studentId &&
            (row.status === 'SUBMITTED' || row.status === 'EXPIRED'),
        );
        const best = attempts.reduce<(typeof attempts)[number] | null>((current, attempt) => {
          if (!current || Number(attempt.score ?? 0) > Number(current.score ?? 0)) return attempt;
          return current;
        }, null);
        return {
          studentId: enrollment.studentId,
          assessmentId: assessment.id,
          score: best?.score != null ? Number(best.score) : null,
          passed: best?.passed ?? null,
        };
      }),
    );
    return {
      classId: input.classId,
      subjectId: input.subjectId,
      students: enrollments.map((row) => ({
        id: row.studentId,
        givenName: row.student.givenName,
        familyName: row.student.familyName,
      })),
      assignments: assignments.map((row) => ({
        id: row.id,
        title: row.title,
        maxScore: row.maxScore,
        publishedAt: row.publishedAt?.toISOString() ?? null,
      })),
      assessments: assessments.map((row) => ({
        id: row.id,
        title: row.title,
        maxScore: row.questions.reduce((sum, question) => sum + question.points, 0),
        publishedAt: row.publishedAt?.toISOString() ?? null,
      })),
      cells,
      assessmentCells,
    };
  }

  async getAttendance(user: AuthUser, query: unknown) {
    const input = attendanceQuerySchema.parse(query);
    const teacher = await this.requireTeacher(user);
    await this.assertTeaching(teacher, input.classId, input.subjectId);
    const takenOn = parseDateOnly(input.date);
    const enrollments = await this.prisma.enrollment.findMany({
      where: { schoolId: teacher.schoolId, classId: input.classId },
      include: { student: true },
      orderBy: [{ student: { familyName: 'asc' } }, { student: { givenName: 'asc' } }],
    });
    const session = await this.prisma.attendanceSession.findUnique({
      where: {
        classId_subjectId_takenOn: {
          classId: input.classId,
          subjectId: input.subjectId,
          takenOn,
        },
      },
      include: { records: true },
    });
    const byStudent = new Map((session?.records ?? []).map((row) => [row.studentId, row.status]));
    return {
      date: input.date,
      records: enrollments.map((row) => ({
        studentId: row.studentId,
        givenName: row.student.givenName,
        familyName: row.student.familyName,
        status: byStudent.get(row.studentId) ?? null,
      })),
    };
  }

  async putAttendance(user: AuthUser, body: unknown) {
    const input = putAttendanceSchema.parse(body);
    const teacher = await this.requireTeacher(user);
    await this.assertTeaching(teacher, input.classId, input.subjectId);
    const takenOn = parseDateOnly(input.date);
    const enrolled = await this.prisma.enrollment.findMany({
      where: { schoolId: teacher.schoolId, classId: input.classId },
      select: { studentId: true },
    });
    const allowed = new Set(enrolled.map((row) => row.studentId));
    if (input.records.some((row) => !allowed.has(row.studentId))) {
      throw new BadRequestException('One or more students are not in this class.');
    }
    const slot = await this.prisma.timetableSlot.findFirst({
      where: {
        schoolId: teacher.schoolId,
        classId: input.classId,
        subjectId: input.subjectId,
        weekday: takenOn.getUTCDay(),
      },
    });
    const session = await this.prisma.attendanceSession.upsert({
      where: {
        classId_subjectId_takenOn: {
          classId: input.classId,
          subjectId: input.subjectId,
          takenOn,
        },
      },
      update: { timetableSlotId: slot?.id ?? null },
      create: {
        schoolId: teacher.schoolId,
        classId: input.classId,
        subjectId: input.subjectId,
        takenOn,
        timetableSlotId: slot?.id ?? null,
      },
    });
    await this.prisma.$transaction(
      input.records.map((row) =>
        this.prisma.attendanceRecord.upsert({
          where: { sessionId_studentId: { sessionId: session.id, studentId: row.studentId } },
          update: { status: row.status },
          create: {
            schoolId: teacher.schoolId,
            sessionId: session.id,
            studentId: row.studentId,
            status: row.status,
          },
        }),
      ),
    );
    return this.getAttendance(user, { classId: input.classId, subjectId: input.subjectId, date: input.date });
  }

  private mapAssignmentList(row: {
    id: string;
    title: string;
    dueAt: Date;
    publishedAt: Date | null;
    classId: string;
    subjectId: string;
    class: { name: string };
    subject: { name: string };
    submissions: unknown[];
  }) {
    return {
      id: row.id,
      title: row.title,
      dueAt: row.dueAt.toISOString(),
      publishedAt: row.publishedAt?.toISOString() ?? null,
      classId: row.classId,
      className: row.class.name,
      subjectId: row.subjectId,
      subjectName: row.subject.name,
      pendingCount: row.submissions.length,
    };
  }

  private mapAssignmentDetail(row: {
    id: string;
    title: string;
    instructions: string;
    dueAt: Date;
    maxScore: number;
    publishedAt: Date | null;
    classId: string;
    subjectId: string;
    class: { name: string };
    subject: { name: string };
    files: { id: string; fileName: string; mimeType: string; size: number }[];
  }) {
    return {
      id: row.id,
      title: row.title,
      instructions: row.instructions,
      dueAt: row.dueAt.toISOString(),
      maxScore: row.maxScore,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      classId: row.classId,
      className: row.class.name,
      subjectId: row.subjectId,
      subjectName: row.subject.name,
      files: row.files.map((file) => ({
        id: file.id,
        fileName: file.fileName,
        mimeType: file.mimeType,
        size: file.size,
      })),
    };
  }

  private async requireUnit(teacher: { id: string; schoolId: string }, id: string) {
    const unit = await this.prisma.unit.findFirst({
      where: { id, schoolId: teacher.schoolId },
    });
    if (!unit || !unit.classId) throw new NotFoundException('Unit not found.');
    await this.assertTeaching(teacher, unit.classId, unit.subjectId);
    return unit;
  }

  private async requireLesson(teacher: { id: string; schoolId: string }, id: string) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id, schoolId: teacher.schoolId },
      include: { unit: true, materials: true },
    });
    if (!lesson || !lesson.unit.classId) throw new NotFoundException('Lesson not found.');
    await this.assertTeaching(teacher, lesson.unit.classId, lesson.unit.subjectId);
    return lesson;
  }

  private async requireAssignment(teacher: { id: string; schoolId: string }, id: string) {
    const row = await this.prisma.assignment.findFirst({
      where: { id, schoolId: teacher.schoolId },
      include: { class: true, subject: true, files: true },
    });
    if (!row) throw new NotFoundException('Assignment not found.');
    await this.assertTeaching(teacher, row.classId, row.subjectId);
    return row;
  }
}
