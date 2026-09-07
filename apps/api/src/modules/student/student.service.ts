import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AssignmentResubmitPolicy, AssignmentSubmissionType, AuthUser } from '@nabta/types';
import {
  assignmentDraftSchema,
  filePresignSchema,
  lessonProgressSchema,
} from '@nabta/validation';
import { sanitizeAssignmentHtml } from '../../common/assignment-html';
import { PrismaService } from '../../prisma/prisma.service';
import { requireSchoolId } from '../academic/school-scope';
import { STORAGE_SERVICE, type StorageService } from '../storage/storage.service';

const MIME_EXT: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'text/plain': 'txt',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

function teacherName(given: string, family: string) {
  return `${given} ${family}`.trim();
}

@Injectable()
export class StudentService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  private schoolId(user: AuthUser) {
    return requireSchoolId(user);
  }

  private async requireStudent(user: AuthUser) {
    const schoolId = this.schoolId(user);
    const student = await this.prisma.student.findFirst({
      where: { userId: user.id, schoolId },
      include: { enrollments: { include: { class: true } } },
    });
    if (!student) {
      throw new ForbiddenException('No student profile is linked to this account.');
    }
    return student;
  }

  private classIds(student: { enrollments: { classId: string }[] }) {
    return student.enrollments.map((row) => row.classId);
  }

  private async assertSubjectInEnrollment(
    schoolId: string,
    classIds: string[],
    subjectId: string,
  ) {
    const assignment = await this.prisma.teachingAssignment.findFirst({
      where: { schoolId, subjectId, classId: { in: classIds } },
    });
    if (!assignment) {
      throw new NotFoundException('Subject not found.');
    }
    return assignment;
  }

  displayStatus(
    dueAt: Date | null,
    submission: { status: string; submittedAt?: Date | null; gradesPublishedAt?: Date | null } | null,
  ): 'NOT_STARTED' | 'DRAFT' | 'SUBMITTED' | 'LATE' | 'GRADED' | 'RETURNED' {
    if (!submission) return 'NOT_STARTED';
    if (submission.status === 'DRAFT') return 'DRAFT';
    if (submission.status === 'RETURNED' && !submission.gradesPublishedAt) return 'RETURNED';
    if (submission.gradesPublishedAt) return 'GRADED';
    if (submission.status === 'LATE') return 'LATE';
    if (submission.status === 'SUBMITTED' || submission.status === 'GRADED' || submission.status === 'RETURNED') {
      if (dueAt && submission.submittedAt && submission.submittedAt > dueAt) return 'LATE';
      return 'SUBMITTED';
    }
    return 'SUBMITTED';
  }

  private visibleNow(now = new Date()) {
    return { publishedAt: { lte: now } };
  }

  canSubmitWork(
    assignment: {
      submissionType?: AssignmentSubmissionType | null;
      closeAt?: Date | null;
      dueAt?: Date | null;
      allowLate?: boolean | null;
      resubmitPolicy?: AssignmentResubmitPolicy | null;
    },
    status: string,
    now = new Date(),
  ) {
    const submissionType = assignment.submissionType ?? 'FILE';
    if (submissionType === 'NONE') return false;
    if (assignment.closeAt && now > assignment.closeAt) return false;
    if (assignment.dueAt && assignment.allowLate === false && now > assignment.dueAt) return false;
    const submitted = ['SUBMITTED', 'LATE', 'GRADED', 'RETURNED'].includes(status);
    if (!submitted) return true;
    if (assignment.resubmitPolicy === 'ALWAYS') return true;
    if (assignment.resubmitPolicy === 'UNTIL_DUE') {
      return !assignment.dueAt || now <= assignment.dueAt;
    }
    return false;
  }

  private publishedLessons() {
    return { where: { publishedAt: { not: null } }, orderBy: { sortOrder: 'asc' as const } };
  }

  async getMe(user: AuthUser) {
    const student = await this.requireStudent(user);
    const enrollment = student.enrollments[0];
    return {
      id: student.id,
      givenName: student.givenName,
      familyName: student.familyName,
      classId: enrollment?.classId ?? null,
      className: enrollment?.class.name ?? null,
    };
  }

  async getDashboard(user: AuthUser) {
    const student = await this.requireStudent(user);
    const schoolId = student.schoolId;
    const classIds = this.classIds(student);
    const weekday = new Date().getDay();

    const [slots, assignments, quizzes, continueRow, submittedCount] = await Promise.all([
      this.prisma.timetableSlot.findMany({
        where: { schoolId, classId: { in: classIds }, weekday },
        include: { subject: true },
        orderBy: { startsAt: 'asc' },
      }),
      this.prisma.assignment.findMany({
        where: {
          schoolId,
          classId: { in: classIds },
          ...this.visibleNow(),
        },
        include: {
          subject: true,
          submissions: { where: { studentId: student.id } },
        },
        orderBy: { dueAt: 'asc' },
        take: 8,
      }),
      this.prisma.assessment.findMany({
        where: { schoolId, classId: { in: classIds }, publishedAt: { not: null } },
        include: {
          subject: true,
          attempts: { where: { studentId: student.id } },
        },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      this.prisma.lessonProgress.findFirst({
        where: { schoolId, studentId: student.id },
        orderBy: { lastAccessedAt: 'desc' },
        include: { lesson: { include: { unit: { include: { subject: true } } } } },
      }),
      this.prisma.assignmentSubmission.count({
        where: {
          schoolId,
          studentId: student.id,
          status: { in: ['SUBMITTED', 'LATE', 'GRADED', 'RETURNED'] },
        },
      }),
    ]);

    const total = await this.prisma.assignment.count({
      where: { schoolId, classId: { in: classIds }, ...this.visibleNow() },
    });

    return {
      schedule: slots.map((slot) => ({
        id: slot.id,
        weekday: slot.weekday,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        room: slot.room,
        subjectId: slot.subjectId,
        subjectName: slot.subject.name,
      })),
      upcoming: [
        ...assignments
          .map((row) => ({
            id: row.id,
            kind: 'assignment' as const,
            title: row.title,
            dueAt: row.dueAt?.toISOString() ?? null,
            subjectName: row.subject.name,
            status: this.displayStatus(row.dueAt, row.submissions[0] ?? null),
          }))
          .filter((item) => ['NOT_STARTED', 'DRAFT', 'LATE', 'RETURNED'].includes(item.status)),
        ...quizzes
          .filter((row) => {
            const finished = row.attempts.filter((attempt) => attempt.status !== 'IN_PROGRESS');
            const inProgress = row.attempts.some((attempt) => attempt.status === 'IN_PROGRESS');
            return inProgress || finished.length < row.maxAttempts;
          })
          .map((row) => {
            const inProgress = row.attempts.some((attempt) => attempt.status === 'IN_PROGRESS');
            const submitted = row.attempts.some((attempt) => attempt.status !== 'IN_PROGRESS');
            return {
              id: row.id,
              kind: 'assessment' as const,
              title: row.title,
              dueAt: null,
              subjectName: row.subject.name,
              status: inProgress ? 'IN_PROGRESS' : submitted ? 'SUBMITTED' : 'NOT_STARTED',
            };
          }),
      ],
      continueLearning: continueRow
        ? {
            lessonId: continueRow.lessonId,
            lessonTitle: continueRow.lesson.title,
            subjectId: continueRow.lesson.unit.subjectId,
            subjectName: continueRow.lesson.unit.subject.name,
          }
        : null,
      overview: { submitted: submittedCount, total },
    };
  }

  async listSubjects(user: AuthUser) {
    const student = await this.requireStudent(user);
    const classIds = this.classIds(student);
    const rows = await this.prisma.teachingAssignment.findMany({
      where: { schoolId: student.schoolId, classId: { in: classIds } },
      include: {
        subject: { include: { units: { include: { lessons: this.publishedLessons() } } } },
        teacher: true,
        class: true,
      },
    });

    const [progress, assignments, quizCounts] = await Promise.all([
      this.prisma.lessonProgress.findMany({
        where: { studentId: student.id, completedAt: { not: null } },
        select: { lessonId: true },
      }),
      this.prisma.assignment.findMany({
        where: {
          schoolId: student.schoolId,
          classId: { in: classIds },
          ...this.visibleNow(),
        },
        include: { submissions: { where: { studentId: student.id } } },
      }),
      this.prisma.assessment.groupBy({
        by: ['subjectId'],
        where: { schoolId: student.schoolId, classId: { in: classIds }, publishedAt: { not: null } },
        _count: { _all: true },
      }),
    ]);
    const done = new Set(progress.map((row) => row.lessonId));
    const assignmentCountBySubject = new Map<string, number>();
    const pendingBySubject = new Map<string, number>();
    for (const assignment of assignments) {
      assignmentCountBySubject.set(
        assignment.subjectId,
        (assignmentCountBySubject.get(assignment.subjectId) ?? 0) + 1,
      );
      const status = this.displayStatus(assignment.dueAt, assignment.submissions[0] ?? null);
      if (['NOT_STARTED', 'DRAFT', 'RETURNED', 'LATE'].includes(status)) {
        pendingBySubject.set(assignment.subjectId, (pendingBySubject.get(assignment.subjectId) ?? 0) + 1);
      }
    }
    const quizCountBySubject = new Map(quizCounts.map((row) => [row.subjectId, row._count._all]));

    return rows.map((row) => {
      const lessons = row.subject.units.flatMap((unit) => unit.lessons);
      const percent =
        lessons.length === 0 ? 0 : Math.round((lessons.filter((l) => done.has(l.id)).length / lessons.length) * 100);
      return {
        id: row.subject.id,
        name: row.subject.name,
        code: row.subject.code,
        teacherName: teacherName(row.teacher.givenName, row.teacher.familyName),
        className: row.class.name,
        progressPercent: percent,
        lessonCount: lessons.length,
        assignmentCount: assignmentCountBySubject.get(row.subject.id) ?? 0,
        quizCount: quizCountBySubject.get(row.subject.id) ?? 0,
        pendingAssignmentCount: pendingBySubject.get(row.subject.id) ?? 0,
      };
    });
  }

  async getSubject(user: AuthUser, subjectId: string) {
    const student = await this.requireStudent(user);
    const classIds = this.classIds(student);
    const teaching = await this.assertSubjectInEnrollment(student.schoolId, classIds, subjectId);
    const subject = await this.prisma.subject.findFirst({
      where: { id: subjectId, schoolId: student.schoolId },
      include: {
        units: {
          orderBy: { sortOrder: 'asc' },
          include: { lessons: this.publishedLessons() },
        },
        assignments: {
          where: { classId: teaching.classId, ...this.visibleNow() },
          orderBy: { dueAt: 'asc' },
          include: { submissions: { where: { studentId: student.id } } },
        },
        assessments: {
          where: { classId: teaching.classId, publishedAt: { not: null } },
          orderBy: { createdAt: 'desc' },
          include: {
            attempts: { where: { studentId: student.id } },
            questions: { select: { points: true } },
          },
        },
      },
    });
    if (!subject) throw new NotFoundException('Subject not found.');

    const [teacher, klass, completed, slots] = await Promise.all([
      this.prisma.teacher.findUnique({ where: { id: teaching.teacherId } }),
      this.prisma.schoolClass.findUnique({ where: { id: teaching.classId } }),
      this.prisma.lessonProgress.findMany({
        where: { studentId: student.id, completedAt: { not: null } },
        select: { lessonId: true, completedAt: true },
      }),
      this.prisma.timetableSlot.findMany({
        where: {
          schoolId: student.schoolId,
          classId: teaching.classId,
          subjectId,
        },
        include: { subject: true },
        orderBy: [{ weekday: 'asc' }, { startsAt: 'asc' }],
      }),
    ]);
    const done = new Set(completed.map((row) => row.lessonId));
    const lessons = subject.units.flatMap((unit) => unit.lessons);
    const lessonById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
    const percent =
      lessons.length === 0 ? 0 : Math.round((lessons.filter((l) => done.has(l.id)).length / lessons.length) * 100);

    const activity: {
      id: string;
      kind: 'lesson' | 'assignment' | 'assessment';
      title: string;
      occurredAt: Date;
      score: number | null;
      maxScore: number | null;
    }[] = [];
    for (const row of completed) {
      const lesson = lessonById.get(row.lessonId);
      if (!lesson || !row.completedAt) continue;
      activity.push({
        id: lesson.id,
        kind: 'lesson',
        title: lesson.title,
        occurredAt: row.completedAt,
        score: null,
        maxScore: null,
      });
    }
    for (const row of subject.assignments) {
      const submission = row.submissions[0];
      if (!submission) continue;
      const status = this.displayStatus(row.dueAt, submission);
      if (status !== 'GRADED' && status !== 'SUBMITTED' && status !== 'LATE') continue;
      const occurredAt = submission.gradedAt ?? submission.submittedAt;
      if (!occurredAt) continue;
      activity.push({
        id: row.id,
        kind: 'assignment',
        title: row.title,
        occurredAt,
        score: status === 'GRADED' && submission.score != null ? Number(submission.score) : null,
        maxScore: row.maxScore,
      });
    }
    for (const row of subject.assessments) {
      const latest = [...row.attempts]
        .filter((attempt) => attempt.status !== 'IN_PROGRESS' && attempt.submittedAt)
        .sort((a, b) => (b.submittedAt?.getTime() ?? 0) - (a.submittedAt?.getTime() ?? 0))[0];
      if (!latest?.submittedAt) continue;
      const maxScore = row.questions.reduce((sum, question) => sum + question.points, 0);
      activity.push({
        id: row.id,
        kind: 'assessment',
        title: row.title,
        occurredAt: latest.submittedAt,
        score: latest.score != null ? Number(latest.score) : null,
        maxScore,
      });
    }
    activity.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
    const recentActivity = activity.slice(0, 5).map((item) => ({
      ...item,
      occurredAt: item.occurredAt.toISOString(),
    }));

    return {
      id: subject.id,
      name: subject.name,
      code: subject.code,
      teacherName: teacher ? teacherName(teacher.givenName, teacher.familyName) : null,
      className: klass?.name ?? '',
      progressPercent: percent,
      schedule: slots.map((slot) => ({
        id: slot.id,
        weekday: slot.weekday,
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        room: slot.room,
        subjectId: slot.subjectId,
        subjectName: slot.subject.name,
      })),
      units: subject.units.map((unit) => ({
        id: unit.id,
        title: unit.title,
        sortOrder: unit.sortOrder,
        lessons: unit.lessons.map((lesson) => ({
          id: lesson.id,
          title: lesson.title,
          type: lesson.type,
          sortOrder: lesson.sortOrder,
          completed: done.has(lesson.id),
        })),
      })),
      assignments: subject.assignments.map((row) => {
        const submission = row.submissions[0] ?? null;
        return {
          id: row.id,
          title: row.title,
          dueAt: row.dueAt?.toISOString() ?? null,
          subjectName: subject.name,
          status: this.displayStatus(row.dueAt, submission),
          maxScore: row.maxScore,
          score:
            submission?.gradesPublishedAt && submission.score != null
              ? Number(submission.score)
              : null,
        };
      }),
      assessments: subject.assessments.map((row) => {
        const inProgress = row.attempts.find((attempt) => attempt.status === 'IN_PROGRESS');
        const finished = row.attempts.filter((attempt) => attempt.status !== 'IN_PROGRESS');
        const maxScore = row.questions.reduce((sum, question) => sum + question.points, 0);
        const best = finished.reduce<number | null>((acc, attempt) => {
          if (attempt.score == null) return acc;
          const value = Number(attempt.score);
          return acc == null || value > acc ? value : acc;
        }, null);
        return {
          id: row.id,
          title: row.title,
          subjectName: subject.name,
          timeLimitMinutes: row.timeLimitMinutes,
          maxAttempts: row.maxAttempts,
          passingScore: row.passingScore,
          attemptsUsed: finished.length + (inProgress ? 1 : 0),
          attemptsRemaining: Math.max(0, row.maxAttempts - finished.length - (inProgress ? 1 : 0)),
          inProgressAttemptId: inProgress?.id ?? null,
          bestScore: best,
          maxScore,
          questionCount: row.questions.length,
          submittedAt:
            [...finished]
              .filter((attempt) => attempt.submittedAt)
              .sort((a, b) => (b.submittedAt?.getTime() ?? 0) - (a.submittedAt?.getTime() ?? 0))[0]
              ?.submittedAt?.toISOString() ?? null,
          passed: best == null || maxScore <= 0 ? null : (best / maxScore) * 100 >= row.passingScore,
          status: inProgress
            ? 'IN_PROGRESS'
            : finished.some((attempt) => attempt.status === 'EXPIRED') && finished.every((attempt) => attempt.status !== 'SUBMITTED')
              ? 'EXPIRED'
              : finished.length > 0
                ? 'SUBMITTED'
                : 'NOT_STARTED',
        };
      }),
      recentActivity,
    };
  }

  async getLesson(user: AuthUser, lessonId: string) {
    const student = await this.requireStudent(user);
    const classIds = this.classIds(student);
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, schoolId: student.schoolId, publishedAt: { not: null } },
      include: {
        unit: {
          include: {
            subject: {
              include: {
                units: {
                  orderBy: { sortOrder: 'asc' },
                  include: { lessons: this.publishedLessons() },
                },
              },
            },
          },
        },
      },
    });
    if (!lesson) throw new NotFoundException('Lesson not found.');
    await this.assertSubjectInEnrollment(student.schoolId, classIds, lesson.unit.subjectId);

    await this.prisma.lessonProgress.upsert({
      where: { studentId_lessonId: { studentId: student.id, lessonId } },
      update: { lastAccessedAt: new Date() },
      create: {
        schoolId: student.schoolId,
        studentId: student.id,
        lessonId,
        lastAccessedAt: new Date(),
      },
    });

    const progress = await this.prisma.lessonProgress.findMany({
      where: { studentId: student.id },
      select: { lessonId: true, completedAt: true },
    });
    const done = new Set(progress.filter((row) => row.completedAt).map((row) => row.lessonId));
    const self = progress.find((row) => row.lessonId === lessonId);

    const units = lesson.unit.subject.units
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((unit) => ({
        id: unit.id,
        title: unit.title,
        sortOrder: unit.sortOrder,
        lessons: unit.lessons.map((item) => ({
          id: item.id,
          title: item.title,
          type: item.type,
          sortOrder: item.sortOrder,
          completed: done.has(item.id),
        })),
      }));

    return {
      id: lesson.id,
      subjectId: lesson.unit.subjectId,
      unitId: lesson.unitId,
      title: lesson.title,
      type: lesson.type,
      body: lesson.body,
      url: lesson.url,
      completed: Boolean(self?.completedAt),
      units,
    };
  }

  async updateProgress(user: AuthUser, lessonId: string, body: unknown) {
    const input = lessonProgressSchema.parse(body);
    await this.getLesson(user, lessonId);
    const student = await this.requireStudent(user);
    const row = await this.prisma.lessonProgress.upsert({
      where: { studentId_lessonId: { studentId: student.id, lessonId } },
      update: {
        lastAccessedAt: new Date(),
        completedAt: input.completed === false ? null : input.completed ? new Date() : undefined,
      },
      create: {
        schoolId: student.schoolId,
        studentId: student.id,
        lessonId,
        lastAccessedAt: new Date(),
        completedAt: input.completed ? new Date() : null,
      },
    });
    return { lessonId, completed: Boolean(row.completedAt) };
  }

  async listAssignments(user: AuthUser) {
    const student = await this.requireStudent(user);
    const classIds = this.classIds(student);
    const rows = await this.prisma.assignment.findMany({
      where: { schoolId: student.schoolId, classId: { in: classIds }, ...this.visibleNow() },
      include: {
        subject: true,
        submissions: { where: { studentId: student.id } },
        _count: { select: { files: true } },
      },
      orderBy: { dueAt: 'asc' },
    });
    return rows.map((row) => {
      const submission = row.submissions[0] ?? null;
      return {
        id: row.id,
        title: row.title,
        dueAt: row.dueAt?.toISOString() ?? null,
        subjectName: row.subject.name,
        status: this.displayStatus(row.dueAt, submission),
        maxScore: row.maxScore,
        score:
          submission?.gradesPublishedAt && submission.score != null
            ? Number(submission.score)
            : null,
        publishedAt: row.publishedAt?.toISOString() ?? null,
        gradesPublishedAt: submission?.gradesPublishedAt?.toISOString() ?? null,
        attachmentCount: row._count.files,
      };
    });
  }

  async getAssignment(user: AuthUser, assignmentId: string) {
    const student = await this.requireStudent(user);
    const classIds = this.classIds(student);
    const row = await this.prisma.assignment.findFirst({
      where: { id: assignmentId, schoolId: student.schoolId, ...this.visibleNow() },
      include: {
        subject: true,
        class: true,
        files: true,
        submissions: { where: { studentId: student.id }, include: { files: true } },
      },
    });
    if (!row || !classIds.includes(row.classId)) {
      throw new NotFoundException('Assignment not found.');
    }
    const submission = row.submissions[0] ?? null;
    const status = this.displayStatus(row.dueAt, submission);
    const published = Boolean(submission?.gradesPublishedAt);
    return {
      id: row.id,
      title: row.title,
      instructions: sanitizeAssignmentHtml(row.instructions),
      dueAt: row.dueAt?.toISOString() ?? null,
      closeAt: row.closeAt?.toISOString() ?? null,
      subjectId: row.subjectId,
      subjectName: row.subject.name,
      className: row.class.name,
      status,
      canSubmit: this.canSubmitWork(row, status),
      maxScore: row.maxScore,
      score: published && submission?.score != null ? Number(submission.score) : null,
      feedback: published ? (submission?.feedback ?? null) : null,
      submissionType: row.submissionType,
      maxFiles: row.maxFiles,
      allowedMimeTypes: row.allowedMimeTypes,
      resubmitPolicy: row.resubmitPolicy,
      allowLate: row.allowLate,
      textResponse: submission?.textResponse ?? null,
      linkUrl: submission?.linkUrl ?? null,
      attachments: await this.mapFiles(row.files),
      files: await this.mapFiles(submission?.files ?? []),
    };
  }

  private async mapFiles(
    files: {
      id: string;
      fileName: string;
      mimeType: string;
      size: number;
      storageKey?: string | null;
      url?: string | null;
    }[],
  ) {
    return Promise.all(
      files.map(async (file) => ({
        id: file.id,
        fileName: file.fileName,
        mimeType: file.mimeType,
        size: file.size,
        url: file.url ?? null,
        downloadUrl: file.storageKey
          ? await this.storage.getObjectUrl(file.storageKey)
          : (file.url ?? null),
      })),
    );
  }

  async presign(user: AuthUser, body: unknown) {
    const input = filePresignSchema.parse(body);
    const assignment = await this.getAssignment(user, input.assignmentId);
    if (!assignment.canSubmit) {
      throw new BadRequestException('This assignment can no longer be updated.');
    }
    const allowed = new Set(assignment.allowedMimeTypes);
    if (!allowed.has(input.mimeType)) {
      throw new BadRequestException('This file type is not allowed.');
    }
    const student = await this.requireStudent(user);
    const ext = MIME_EXT[input.mimeType] ?? 'bin';
    const storageKey = `${student.schoolId}/submissions/${input.assignmentId}/${student.id}/${randomUUID()}.${ext}`;
    const uploadUrl = await this.storage.getUploadUrl(storageKey);
    return { storageKey, uploadUrl };
  }

  async saveDraft(user: AuthUser, assignmentId: string, body: unknown) {
    const input = assignmentDraftSchema.parse(body);
    const assignment = await this.getAssignment(user, assignmentId);
    if (!assignment.canSubmit) {
      throw new BadRequestException('This assignment can no longer be updated.');
    }
    const student = await this.requireStudent(user);
    const submission = await this.prisma.assignmentSubmission.upsert({
      where: { assignmentId_studentId: { assignmentId, studentId: student.id } },
      update: {
        ...(input.textResponse !== undefined ? { textResponse: input.textResponse } : {}),
        ...(input.linkUrl !== undefined ? { linkUrl: input.linkUrl || null } : {}),
      },
      create: {
        schoolId: student.schoolId,
        assignmentId,
        studentId: student.id,
        status: 'DRAFT',
        textResponse: input.textResponse ?? null,
        linkUrl: input.linkUrl || null,
      },
    });

    if (input.storageKey && input.mimeType && input.fileName && input.size != null) {
      const prefix = `${student.schoolId}/submissions/${assignmentId}/${student.id}/`;
      if (!input.storageKey.startsWith(prefix)) {
        throw new BadRequestException('Invalid file key.');
      }
      const allowed = new Set(assignment.allowedMimeTypes);
      if (!allowed.has(input.mimeType)) {
        throw new BadRequestException('This file type is not allowed.');
      }
      const count = await this.prisma.submissionFile.count({ where: { submissionId: submission.id } });
      if (count >= assignment.maxFiles) {
        if (assignment.maxFiles === 1) {
          await this.prisma.submissionFile.deleteMany({ where: { submissionId: submission.id } });
        } else {
          throw new BadRequestException('Maximum files reached.');
        }
      }
      await this.prisma.submissionFile.create({
        data: {
          schoolId: student.schoolId,
          submissionId: submission.id,
          storageKey: input.storageKey,
          fileName: input.fileName,
          mimeType: input.mimeType,
          size: input.size,
        },
      });
    }

    return this.getAssignment(user, assignmentId);
  }

  async deleteSubmissionFile(user: AuthUser, assignmentId: string, fileId: string) {
    const view = await this.getAssignment(user, assignmentId);
    if (!view.canSubmit) {
      throw new BadRequestException('This assignment can no longer be updated.');
    }
    const student = await this.requireStudent(user);
    const submission = await this.prisma.assignmentSubmission.findUnique({
      where: { assignmentId_studentId: { assignmentId, studentId: student.id } },
    });
    if (!submission) throw new NotFoundException('File not found.');
    const file = await this.prisma.submissionFile.findFirst({
      where: { id: fileId, submissionId: submission.id, schoolId: student.schoolId },
    });
    if (!file) throw new NotFoundException('File not found.');
    try {
      await this.storage.deleteObject(file.storageKey);
    } catch {
      // Keep deleting the row even if object storage is unreachable.
    }
    await this.prisma.submissionFile.delete({ where: { id: file.id } });
    return this.getAssignment(user, assignmentId);
  }

  async submit(user: AuthUser, assignmentId: string) {
    const view = await this.getAssignment(user, assignmentId);
    if (!view.canSubmit) {
      throw new BadRequestException('This assignment can no longer be updated.');
    }
    const student = await this.requireStudent(user);
    const assignment = await this.prisma.assignment.findFirst({
      where: { id: assignmentId, schoolId: student.schoolId },
    });
    if (!assignment) throw new NotFoundException('Assignment not found.');

    const submission = await this.prisma.assignmentSubmission.upsert({
      where: { assignmentId_studentId: { assignmentId, studentId: student.id } },
      update: {},
      create: {
        schoolId: student.schoolId,
        assignmentId,
        studentId: student.id,
        status: 'DRAFT',
      },
    });
    const fileCount = await this.prisma.submissionFile.count({ where: { submissionId: submission.id } });
    const text = (submission.textResponse ?? view.textResponse ?? '').trim();
    const link = (submission.linkUrl ?? view.linkUrl ?? '').trim();
    const type = assignment.submissionType;
    if (type === 'NONE') {
      throw new BadRequestException('This assignment does not accept submissions.');
    }
    if (type === 'FILE' && fileCount === 0) {
      throw new BadRequestException('Upload a file before submitting.');
    }
    if (type === 'TEXT' && !text) {
      throw new BadRequestException('Add a text response before submitting.');
    }
    if (type === 'LINK' && !link) {
      throw new BadRequestException('Add a link before submitting.');
    }
    if (type === 'MULTIPLE' && fileCount === 0 && !text && !link) {
      throw new BadRequestException('Add a file, text, or link before submitting.');
    }

    const now = new Date();
    const late = Boolean(assignment.dueAt && now > assignment.dueAt);

    await this.prisma.assignmentSubmission.update({
      where: { id: submission.id },
      data: {
        status: late ? 'LATE' : 'SUBMITTED',
        submittedAt: now,
        score: null,
        feedback: null,
        gradedAt: null,
        gradesPublishedAt: null,
      },
    });

    return this.getAssignment(user, assignmentId);
  }
}
