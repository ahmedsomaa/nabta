import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser, AttemptStatus, StudentAssessmentStatus } from '@nabta/types';
import {
  createAssessmentSchema,
  createQuestionOptionSchema,
  createQuestionSchema,
  reorderQuestionsSchema,
  saveAttemptAnswerSchema,
  updateAssessmentSchema,
  updateQuestionOptionSchema,
  updateQuestionSchema,
} from '@nabta/validation';
import { PrismaService } from '../../prisma/prisma.service';
import { requireSchoolId } from '../academic/school-scope';
import { GradeRecordService } from './grade-record.service';
import { scoreQuestion, shuffleIds } from './scoring';

const questionInclude = { options: { orderBy: { sortOrder: 'asc' as const } } };

@Injectable()
export class AssessmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly grades: GradeRecordService,
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

  private async requireTeacherAssessment(user: AuthUser, id: string) {
    const teacher = await this.requireTeacher(user);
    const row = await this.prisma.assessment.findFirst({
      where: { id, schoolId: teacher.schoolId },
      include: {
        class: true,
        subject: true,
        questions: { orderBy: { sortOrder: 'asc' }, include: questionInclude },
      },
    });
    if (!row) throw new NotFoundException('Assessment not found.');
    await this.assertTeaching(teacher, row.classId, row.subjectId);
    return { teacher, row };
  }

  private async requireStudent(user: AuthUser) {
    const schoolId = this.schoolId(user);
    const student = await this.prisma.student.findFirst({
      where: { userId: user.id, schoolId },
      include: { enrollments: true },
    });
    if (!student) {
      throw new ForbiddenException('No student profile is linked to this account.');
    }
    return student;
  }

  private classIds(student: { enrollments: { classId: string }[] }) {
    return student.enrollments.map((row) => row.classId);
  }

  private questionOrder(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
  }

  private mapTeacherDetail(row: {
    id: string;
    title: string;
    instructions: string;
    timeLimitMinutes: number | null;
    maxAttempts: number;
    passingScore: number;
    randomizeQuestions: boolean;
    publishedAt: Date | null;
    classId: string;
    subjectId: string;
    unitId: string | null;
    class: { name: string };
    subject: { name: string };
    questions: {
      id: string;
      type: TeacherQuestionType;
      prompt: string;
      points: number;
      sortOrder: number;
      feedback: string | null;
      options: { id: string; text: string; isCorrect: boolean; sortOrder: number }[];
    }[];
  }) {
    return {
      id: row.id,
      title: row.title,
      instructions: row.instructions,
      timeLimitMinutes: row.timeLimitMinutes,
      maxAttempts: row.maxAttempts,
      passingScore: row.passingScore,
      randomizeQuestions: row.randomizeQuestions,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      classId: row.classId,
      className: row.class.name,
      subjectId: row.subjectId,
      subjectName: row.subject.name,
      unitId: row.unitId,
      questions: row.questions.map((question) => ({
        id: question.id,
        type: question.type,
        prompt: question.prompt,
        points: question.points,
        sortOrder: question.sortOrder,
        feedback: question.feedback,
        options: question.options.map((option) => ({
          id: option.id,
          text: option.text,
          isCorrect: option.isCorrect,
          sortOrder: option.sortOrder,
        })),
      })),
    };
  }

  async listTeacherAssessments(user: AuthUser) {
    const teacher = await this.requireTeacher(user);
    const pairs = teacher.teachingAssignments;
    if (pairs.length === 0) return [];
    const or = pairs.map((row) => ({ classId: row.classId, subjectId: row.subjectId }));
    const rows = await this.prisma.assessment.findMany({
      where: { schoolId: teacher.schoolId, OR: or },
      include: {
        class: true,
        subject: true,
        questions: { select: { id: true } },
        attempts: { where: { status: { in: ['SUBMITTED', 'EXPIRED'] } }, select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      classId: row.classId,
      className: row.class.name,
      subjectId: row.subjectId,
      subjectName: row.subject.name,
      questionCount: row.questions.length,
      attemptCount: row.attempts.length,
    }));
  }

  async createAssessment(user: AuthUser, body: unknown) {
    const input = createAssessmentSchema.parse(body);
    const teacher = await this.requireTeacher(user);
    await this.assertTeaching(teacher, input.classId, input.subjectId);
    const row = await this.prisma.assessment.create({
      data: {
        schoolId: teacher.schoolId,
        classId: input.classId,
        subjectId: input.subjectId,
        unitId: input.unitId ?? null,
        title: input.title,
        instructions: input.instructions ?? '',
        timeLimitMinutes: input.timeLimitMinutes ?? null,
        maxAttempts: input.maxAttempts ?? 1,
        passingScore: input.passingScore ?? 60,
        randomizeQuestions: input.randomizeQuestions ?? false,
      },
      include: {
        class: true,
        subject: true,
        questions: { orderBy: { sortOrder: 'asc' }, include: questionInclude },
      },
    });
    return this.mapTeacherDetail(row);
  }

  async getTeacherAssessment(user: AuthUser, id: string) {
    const { row } = await this.requireTeacherAssessment(user, id);
    return this.mapTeacherDetail(row);
  }

  async updateAssessment(user: AuthUser, id: string, body: unknown) {
    const input = updateAssessmentSchema.parse(body);
    const { row } = await this.requireTeacherAssessment(user, id);
    const updated = await this.prisma.assessment.update({
      where: { id: row.id },
      data: {
        ...(input.title != null ? { title: input.title } : {}),
        ...(input.instructions != null ? { instructions: input.instructions } : {}),
        ...(input.unitId !== undefined ? { unitId: input.unitId } : {}),
        ...(input.timeLimitMinutes !== undefined ? { timeLimitMinutes: input.timeLimitMinutes } : {}),
        ...(input.maxAttempts != null ? { maxAttempts: input.maxAttempts } : {}),
        ...(input.passingScore != null ? { passingScore: input.passingScore } : {}),
        ...(input.randomizeQuestions != null ? { randomizeQuestions: input.randomizeQuestions } : {}),
      },
      include: {
        class: true,
        subject: true,
        questions: { orderBy: { sortOrder: 'asc' }, include: questionInclude },
      },
    });
    return this.mapTeacherDetail(updated);
  }

  async deleteAssessment(user: AuthUser, id: string) {
    const { row } = await this.requireTeacherAssessment(user, id);
    await this.prisma.assessment.delete({ where: { id: row.id } });
    return { id: row.id };
  }

  async publishAssessment(user: AuthUser, id: string) {
    const { row } = await this.requireTeacherAssessment(user, id);
    const updated = await this.prisma.assessment.update({
      where: { id: row.id },
      data: { publishedAt: row.publishedAt ?? new Date() },
      include: {
        class: true,
        subject: true,
        questions: { orderBy: { sortOrder: 'asc' }, include: questionInclude },
      },
    });
    return this.mapTeacherDetail(updated);
  }

  async unpublishAssessment(user: AuthUser, id: string) {
    const { row } = await this.requireTeacherAssessment(user, id);
    const updated = await this.prisma.assessment.update({
      where: { id: row.id },
      data: { publishedAt: null },
      include: {
        class: true,
        subject: true,
        questions: { orderBy: { sortOrder: 'asc' }, include: questionInclude },
      },
    });
    return this.mapTeacherDetail(updated);
  }

  async createQuestion(user: AuthUser, assessmentId: string, body: unknown) {
    const input = createQuestionSchema.parse(body);
    const { teacher, row } = await this.requireTeacherAssessment(user, assessmentId);
    const last = row.questions[row.questions.length - 1];
    const created = await this.prisma.question.create({
      data: {
        schoolId: teacher.schoolId,
        assessmentId: row.id,
        type: input.type,
        prompt: input.prompt,
        points: input.points ?? 1,
        feedback: input.feedback ?? null,
        sortOrder: (last?.sortOrder ?? -1) + 1,
        options: input.options?.length
          ? {
              create: input.options.map((option, index) => ({
                schoolId: teacher.schoolId,
                text: option.text,
                isCorrect: option.isCorrect ?? false,
                sortOrder: index,
              })),
            }
          : input.type === 'TRUE_FALSE'
            ? {
                create: [
                  { schoolId: teacher.schoolId, text: 'True', isCorrect: true, sortOrder: 0 },
                  { schoolId: teacher.schoolId, text: 'False', isCorrect: false, sortOrder: 1 },
                ],
              }
            : undefined,
      },
      include: questionInclude,
    });
    return created;
  }

  async updateQuestion(user: AuthUser, id: string, body: unknown) {
    const input = updateQuestionSchema.parse(body);
    const teacher = await this.requireTeacher(user);
    const question = await this.prisma.question.findFirst({
      where: { id, schoolId: teacher.schoolId },
      include: { assessment: true },
    });
    if (!question) throw new NotFoundException('Question not found.');
    await this.assertTeaching(teacher, question.assessment.classId, question.assessment.subjectId);
    return this.prisma.question.update({
      where: { id },
      data: {
        ...(input.prompt != null ? { prompt: input.prompt } : {}),
        ...(input.points != null ? { points: input.points } : {}),
        ...(input.feedback !== undefined ? { feedback: input.feedback } : {}),
        ...(input.type != null ? { type: input.type } : {}),
      },
      include: questionInclude,
    });
  }

  async deleteQuestion(user: AuthUser, id: string) {
    const teacher = await this.requireTeacher(user);
    const question = await this.prisma.question.findFirst({
      where: { id, schoolId: teacher.schoolId },
      include: { assessment: true },
    });
    if (!question) throw new NotFoundException('Question not found.');
    await this.assertTeaching(teacher, question.assessment.classId, question.assessment.subjectId);
    await this.prisma.question.delete({ where: { id } });
    return { id };
  }

  async reorderQuestions(user: AuthUser, assessmentId: string, body: unknown) {
    const input = reorderQuestionsSchema.parse(body);
    const { row } = await this.requireTeacherAssessment(user, assessmentId);
    const allowed = new Set(row.questions.map((question) => question.id));
    if (input.ids.some((id) => !allowed.has(id))) {
      throw new BadRequestException('Invalid question order.');
    }
    await this.prisma.$transaction(
      input.ids.map((id, index) => this.prisma.question.update({ where: { id }, data: { sortOrder: index } })),
    );
    return this.getTeacherAssessment(user, assessmentId);
  }

  async createOption(user: AuthUser, questionId: string, body: unknown) {
    const input = createQuestionOptionSchema.parse(body);
    const teacher = await this.requireTeacher(user);
    const question = await this.prisma.question.findFirst({
      where: { id: questionId, schoolId: teacher.schoolId },
      include: { assessment: true, options: true },
    });
    if (!question) throw new NotFoundException('Question not found.');
    await this.assertTeaching(teacher, question.assessment.classId, question.assessment.subjectId);
    return this.prisma.questionOption.create({
      data: {
        schoolId: teacher.schoolId,
        questionId,
        text: input.text,
        isCorrect: input.isCorrect ?? false,
        sortOrder: question.options.length,
      },
    });
  }

  async updateOption(user: AuthUser, id: string, body: unknown) {
    const input = updateQuestionOptionSchema.parse(body);
    const teacher = await this.requireTeacher(user);
    const option = await this.prisma.questionOption.findFirst({
      where: { id, schoolId: teacher.schoolId },
      include: { question: { include: { assessment: true } } },
    });
    if (!option) throw new NotFoundException('Option not found.');
    await this.assertTeaching(teacher, option.question.assessment.classId, option.question.assessment.subjectId);
    return this.prisma.questionOption.update({
      where: { id },
      data: {
        ...(input.text != null ? { text: input.text } : {}),
        ...(input.isCorrect != null ? { isCorrect: input.isCorrect } : {}),
      },
    });
  }

  async deleteOption(user: AuthUser, id: string) {
    const teacher = await this.requireTeacher(user);
    const option = await this.prisma.questionOption.findFirst({
      where: { id, schoolId: teacher.schoolId },
      include: { question: { include: { assessment: true } } },
    });
    if (!option) throw new NotFoundException('Option not found.');
    await this.assertTeaching(teacher, option.question.assessment.classId, option.question.assessment.subjectId);
    await this.prisma.questionOption.delete({ where: { id } });
    return { id };
  }

  async getResults(user: AuthUser, id: string) {
    const { row } = await this.requireTeacherAssessment(user, id);
    const maxScore = row.questions.reduce((sum, question) => sum + question.points, 0);
    const enrollments = await this.prisma.enrollment.findMany({
      where: { schoolId: row.schoolId, classId: row.classId },
      include: { student: true },
      orderBy: [{ student: { familyName: 'asc' } }, { student: { givenName: 'asc' } }],
    });
    const attempts = await this.prisma.assessmentAttempt.findMany({
      where: { assessmentId: row.id, status: { in: ['SUBMITTED', 'EXPIRED'] } },
    });
    const byStudent = new Map<string, (typeof attempts)[number]>();
    for (const attempt of attempts) {
      const current = byStudent.get(attempt.studentId);
      if (!current || Number(attempt.score ?? 0) > Number(current.score ?? 0)) {
        byStudent.set(attempt.studentId, attempt);
      }
    }
    const scored = [...byStudent.values()];
    const average =
      scored.length === 0
        ? null
        : Math.round(
            (scored.reduce((sum, attempt) => sum + Number(attempt.score ?? 0), 0) / scored.length) * 100,
          ) / 100;
    const passRate =
      scored.length === 0
        ? null
        : Math.round((scored.filter((attempt) => attempt.passed).length / scored.length) * 100);
    return {
      assessmentId: row.id,
      title: row.title,
      passingScore: row.passingScore,
      attemptCount: attempts.length,
      average,
      passRate,
      students: enrollments.map((enrollment) => {
        const best = byStudent.get(enrollment.studentId);
        return {
          studentId: enrollment.studentId,
          givenName: enrollment.student.givenName,
          familyName: enrollment.student.familyName,
          bestScore: best?.score != null ? Number(best.score) : null,
          maxScore,
          passed: best?.passed ?? null,
          attemptId: best?.id ?? null,
        };
      }),
    };
  }

  async getTeacherAttempt(user: AuthUser, assessmentId: string, attemptId: string) {
    const { row } = await this.requireTeacherAssessment(user, assessmentId);
    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: { id: attemptId, assessmentId: row.id, schoolId: row.schoolId },
      include: {
        student: true,
        answers: true,
      },
    });
    if (!attempt) throw new NotFoundException('Attempt not found.');
    const order = this.questionOrder(attempt.questionOrder);
    const questions = [...row.questions].sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
    const answers = new Map(attempt.answers.map((answer) => [answer.questionId, answer]));
    return {
      id: attempt.id,
      studentId: attempt.studentId,
      givenName: attempt.student.givenName,
      familyName: attempt.student.familyName,
      status: attempt.status,
      score: attempt.score != null ? Number(attempt.score) : null,
      maxScore: attempt.maxScore,
      passed: attempt.passed,
      submittedAt: attempt.submittedAt?.toISOString() ?? null,
      questions: questions.map((question) => {
        const answer = answers.get(question.id);
        return {
          id: question.id,
          prompt: question.prompt,
          type: question.type,
          points: question.points,
          feedback: question.feedback,
          correct:
            scoreQuestion(question, answer?.optionIds ?? [], answer?.textAnswer) === question.points,
          options: question.options.map((option) => ({
            id: option.id,
            text: option.text,
            isCorrect: option.isCorrect,
            sortOrder: option.sortOrder,
          })),
          selectedOptionIds: answer?.optionIds ?? [],
          textAnswer: answer?.textAnswer ?? null,
        };
      }),
    };
  }

  private async publishedForStudent(student: {
    id: string;
    schoolId: string;
    enrollments: { classId: string }[];
  }) {
    return this.prisma.assessment.findMany({
      where: {
        schoolId: student.schoolId,
        classId: { in: this.classIds(student) },
        publishedAt: { not: null },
      },
      include: {
        subject: true,
        questions: { select: { points: true } },
        attempts: { where: { studentId: student.id } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private summarizeStudentAssessment(row: Awaited<ReturnType<AssessmentsService['publishedForStudent']>>[number]) {
    const finished = row.attempts.filter((attempt) => attempt.status !== 'IN_PROGRESS');
    const inProgress = row.attempts.find((attempt) => attempt.status === 'IN_PROGRESS');
    const attemptsUsed = finished.length + (inProgress ? 1 : 0);
    const maxScore = row.questions.reduce((sum, question) => sum + question.points, 0);
    const best = finished.reduce<{ score: number; passed: boolean | null } | null>((current, attempt) => {
      if (attempt.score == null) return current;
      const value = Number(attempt.score);
      if (!current || value > current.score) return { score: value, passed: attempt.passed };
      return current;
    }, null);
    let status: StudentAssessmentStatus = 'NOT_STARTED';
    if (inProgress) status = 'IN_PROGRESS';
    else if (finished.some((attempt) => attempt.status === 'EXPIRED')) status = 'EXPIRED';
    else if (finished.length > 0) status = 'SUBMITTED';
    return {
      id: row.id,
      title: row.title,
      subjectName: row.subject.name,
      timeLimitMinutes: row.timeLimitMinutes,
      maxAttempts: row.maxAttempts,
      passingScore: row.passingScore,
      attemptsUsed,
      attemptsRemaining: Math.max(0, row.maxAttempts - attemptsUsed),
      inProgressAttemptId: inProgress?.id ?? null,
      bestScore: best?.score ?? null,
      maxScore,
      passed: best?.passed ?? null,
      status,
    };
  }

  async listStudentAssessments(user: AuthUser) {
    const student = await this.requireStudent(user);
    const rows = await this.publishedForStudent(student);
    return rows.map((row) => this.summarizeStudentAssessment(row));
  }

  async getStudentOverview(user: AuthUser, id: string) {
    const student = await this.requireStudent(user);
    const row = await this.prisma.assessment.findFirst({
      where: {
        id,
        schoolId: student.schoolId,
        classId: { in: this.classIds(student) },
        publishedAt: { not: null },
      },
      include: {
        subject: true,
        questions: { select: { id: true, points: true } },
        attempts: { where: { studentId: student.id } },
      },
    });
    if (!row) throw new NotFoundException('Assessment not found.');
    const summary = this.summarizeStudentAssessment({ ...row, subject: row.subject });
    return {
      ...summary,
      instructions: row.instructions,
      randomizeQuestions: row.randomizeQuestions,
      questionCount: row.questions.length,
      canStart: Boolean(summary.inProgressAttemptId) || summary.attemptsRemaining > 0,
    };
  }

  private async autoExpire(attempt: {
    id: string;
    status: AttemptStatus;
    expiresAt: Date | null;
    assessmentId: string;
    studentId: string;
    schoolId: string;
  }) {
    if (attempt.status !== 'IN_PROGRESS' || !attempt.expiresAt || attempt.expiresAt > new Date()) {
      return attempt;
    }
    return this.finalizeAttempt(attempt.id, 'EXPIRED');
  }

  private async finalizeAttempt(attemptId: string, status: 'SUBMITTED' | 'EXPIRED') {
    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: { id: attemptId },
      include: {
        answers: true,
        assessment: {
          include: { questions: { include: questionInclude } },
        },
      },
    });
    if (!attempt) throw new NotFoundException('Attempt not found.');
    const maxScore = attempt.assessment.questions.reduce((sum, question) => sum + question.points, 0);
    const answers = new Map(attempt.answers.map((answer) => [answer.questionId, answer]));
    let score = 0;
    for (const question of attempt.assessment.questions) {
      const answer = answers.get(question.id);
      score += scoreQuestion(question, answer?.optionIds ?? [], answer?.textAnswer);
    }
    const percent = maxScore === 0 ? 0 : (score / maxScore) * 100;
    const passed = percent >= attempt.assessment.passingScore;
    const updated = await this.prisma.assessmentAttempt.update({
      where: { id: attemptId },
      data: {
        status,
        submittedAt: new Date(),
        score,
        maxScore,
        passed,
      },
    });
    await this.grades.recompute(
      attempt.schoolId,
      attempt.studentId,
      attempt.assessment.classId,
      attempt.assessment.subjectId,
    );
    return updated;
  }

  async startAttempt(user: AuthUser, assessmentId: string) {
    const student = await this.requireStudent(user);
    const assessment = await this.prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        schoolId: student.schoolId,
        classId: { in: this.classIds(student) },
        publishedAt: { not: null },
      },
      include: { questions: { orderBy: { sortOrder: 'asc' }, include: questionInclude } },
    });
    if (!assessment) throw new NotFoundException('Assessment not found.');
    if (assessment.questions.length === 0) {
      throw new BadRequestException('This quiz has no questions yet.');
    }

    const existing = await this.prisma.assessmentAttempt.findMany({
      where: { assessmentId: assessment.id, studentId: student.id },
    });
    const inProgress = existing.find((row) => row.status === 'IN_PROGRESS');
    if (inProgress) {
      const live = await this.autoExpire(inProgress);
      if (live.status === 'IN_PROGRESS') {
        return this.getStudentAttempt(user, live.id);
      }
    }
    const finishedCount = await this.prisma.assessmentAttempt.count({
      where: {
        assessmentId: assessment.id,
        studentId: student.id,
        status: { not: 'IN_PROGRESS' },
      },
    });
    if (finishedCount >= assessment.maxAttempts) {
      throw new BadRequestException('No attempts remaining.');
    }

    const ids = assessment.questions.map((question) => question.id);
    const order = assessment.randomizeQuestions ? shuffleIds(ids) : ids;
    const expiresAt = assessment.timeLimitMinutes
      ? new Date(Date.now() + assessment.timeLimitMinutes * 60_000)
      : null;
    const created = await this.prisma.assessmentAttempt.create({
      data: {
        schoolId: student.schoolId,
        assessmentId: assessment.id,
        studentId: student.id,
        questionOrder: order,
        expiresAt,
        maxScore: assessment.questions.reduce((sum, question) => sum + question.points, 0),
      },
    });
    return this.getStudentAttempt(user, created.id);
  }

  async getStudentAttempt(user: AuthUser, attemptId: string) {
    const student = await this.requireStudent(user);
    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: { id: attemptId, studentId: student.id, schoolId: student.schoolId },
      include: {
        answers: true,
        assessment: {
          include: { questions: { include: questionInclude } },
        },
      },
    });
    if (!attempt || !attempt.assessment.publishedAt) {
      throw new NotFoundException('Attempt not found.');
    }
    if (attempt.status === 'IN_PROGRESS') {
      const live = await this.autoExpire(attempt);
      if (live.status !== 'IN_PROGRESS') {
        const expired = await this.prisma.assessmentAttempt.findFirst({
          where: { id: attemptId },
          include: {
            answers: true,
            assessment: { include: { questions: { include: questionInclude } } },
          },
        });
        if (expired) {
          Object.assign(attempt, expired);
        }
      }
    }
    const order = this.questionOrder(attempt.questionOrder);
    const questions = [...attempt.assessment.questions].sort(
      (a, b) => order.indexOf(a.id) - order.indexOf(b.id),
    );
    const answers = new Map(attempt.answers.map((answer) => [answer.questionId, answer]));
    return {
      id: attempt.id,
      assessmentId: attempt.assessmentId,
      status: attempt.status,
      expiresAt: attempt.expiresAt?.toISOString() ?? null,
      questions: questions.map((question) => {
        const answer = answers.get(question.id);
        return {
          id: question.id,
          type: question.type,
          prompt: question.prompt,
          points: question.points,
          options: question.options.map((option) => ({
            id: option.id,
            text: option.text,
            sortOrder: option.sortOrder,
          })),
          selectedOptionIds: answer?.optionIds ?? [],
          textAnswer: answer?.textAnswer ?? null,
        };
      }),
    };
  }

  async saveAnswer(user: AuthUser, attemptId: string, body: unknown) {
    const input = saveAttemptAnswerSchema.parse(body);
    const student = await this.requireStudent(user);
    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: { id: attemptId, studentId: student.id, schoolId: student.schoolId },
    });
    if (!attempt) throw new NotFoundException('Attempt not found.');
    const live = await this.autoExpire(attempt);
    if (live.status !== 'IN_PROGRESS') {
      throw new BadRequestException('This attempt has ended.');
    }
    const question = await this.prisma.question.findFirst({
      where: { id: input.questionId, assessmentId: attempt.assessmentId },
    });
    if (!question) throw new NotFoundException('Question not found.');
    await this.prisma.attemptAnswer.upsert({
      where: { attemptId_questionId: { attemptId, questionId: input.questionId } },
      update: {
        optionIds: input.optionIds ?? [],
        textAnswer: input.textAnswer ?? null,
      },
      create: {
        schoolId: student.schoolId,
        attemptId,
        questionId: input.questionId,
        optionIds: input.optionIds ?? [],
        textAnswer: input.textAnswer ?? null,
      },
    });
    return this.getStudentAttempt(user, attemptId);
  }

  async submitAttempt(user: AuthUser, attemptId: string) {
    const student = await this.requireStudent(user);
    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: { id: attemptId, studentId: student.id, schoolId: student.schoolId },
    });
    if (!attempt) throw new NotFoundException('Attempt not found.');
    if (attempt.status === 'IN_PROGRESS') {
      const live = await this.autoExpire(attempt);
      if (live.status === 'IN_PROGRESS') {
        await this.finalizeAttempt(attempt.id, 'SUBMITTED');
      }
    }
    return this.getStudentResult(user, attemptId);
  }

  async getStudentResult(user: AuthUser, attemptId: string) {
    const student = await this.requireStudent(user);
    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: { id: attemptId, studentId: student.id, schoolId: student.schoolId },
      include: {
        answers: true,
        assessment: {
          include: { questions: { include: questionInclude } },
        },
      },
    });
    if (!attempt || attempt.status === 'IN_PROGRESS') {
      throw new NotFoundException('Result not found.');
    }
    const order = this.questionOrder(attempt.questionOrder);
    const questions = [...attempt.assessment.questions].sort(
      (a, b) => order.indexOf(a.id) - order.indexOf(b.id),
    );
    const answers = new Map(attempt.answers.map((answer) => [answer.questionId, answer]));
    return {
      id: attempt.id,
      assessmentId: attempt.assessmentId,
      title: attempt.assessment.title,
      status: attempt.status,
      score: Number(attempt.score ?? 0),
      maxScore: attempt.maxScore,
      passed: Boolean(attempt.passed),
      submittedAt: attempt.submittedAt?.toISOString() ?? null,
      questions: questions.map((question) => {
        const answer = answers.get(question.id);
        const awarded = scoreQuestion(question, answer?.optionIds ?? [], answer?.textAnswer);
        return {
          id: question.id,
          type: question.type,
          prompt: question.prompt,
          points: question.points,
          awarded,
          feedback: question.feedback,
          options: question.options.map((option) => ({
            id: option.id,
            text: option.text,
            sortOrder: option.sortOrder,
            isCorrect: option.isCorrect,
          })),
          selectedOptionIds: answer?.optionIds ?? [],
          textAnswer: answer?.textAnswer ?? null,
        };
      }),
    };
  }

  async listGrades(user: AuthUser) {
    const student = await this.requireStudent(user);
    const classIds = this.classIds(student);
    const teaching = await this.prisma.teachingAssignment.findMany({
      where: { schoolId: student.schoolId, classId: { in: classIds } },
      include: { subject: true, class: true },
    });
    const records = await this.prisma.gradeRecord.findMany({
      where: { studentId: student.id, classId: { in: classIds } },
    });
    const bySubject = new Map(records.map((row) => [`${row.classId}:${row.subjectId}`, row]));
    return teaching.map((row) => {
      const record = bySubject.get(`${row.classId}:${row.subjectId}`);
      return {
        subjectId: row.subjectId,
        subjectName: row.subject.name,
        className: row.class.name,
        percentage: record ? Number(record.percentage) : null,
        letter: record?.letter ?? null,
      };
    });
  }

  async getGradeDetail(user: AuthUser, subjectId: string) {
    const student = await this.requireStudent(user);
    const classIds = this.classIds(student);
    const teaching = await this.prisma.teachingAssignment.findFirst({
      where: { schoolId: student.schoolId, subjectId, classId: { in: classIds } },
      include: { subject: true, class: true },
    });
    if (!teaching) throw new NotFoundException('Subject not found.');
    const [record, assignments, assessments] = await Promise.all([
      this.prisma.gradeRecord.findUnique({
        where: {
          studentId_classId_subjectId: {
            studentId: student.id,
            classId: teaching.classId,
            subjectId,
          },
        },
      }),
      this.prisma.assignment.findMany({
        where: {
          schoolId: student.schoolId,
          classId: teaching.classId,
          subjectId,
          publishedAt: { not: null },
        },
        include: { submissions: { where: { studentId: student.id } } },
        orderBy: { dueAt: 'asc' },
      }),
      this.prisma.assessment.findMany({
        where: {
          schoolId: student.schoolId,
          classId: teaching.classId,
          subjectId,
          publishedAt: { not: null },
        },
        include: {
          questions: { select: { points: true } },
          attempts: {
            where: { studentId: student.id, status: { in: ['SUBMITTED', 'EXPIRED'] } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return {
      subjectId,
      subjectName: teaching.subject.name,
      className: teaching.class.name,
      percentage: record ? Number(record.percentage) : null,
      letter: record?.letter ?? null,
      assignments: assignments.map((assignment) => {
        const submission = assignment.submissions[0];
        const published = Boolean(submission?.gradesPublishedAt);
        return {
          id: assignment.id,
          title: assignment.title,
          score: published && submission?.score != null ? Number(submission.score) : null,
          maxScore: assignment.maxScore,
          feedback: published ? (submission?.feedback ?? null) : null,
        };
      }),
      assessments: assessments.map((assessment) => {
        const maxScore = assessment.questions.reduce((sum, question) => sum + question.points, 0);
        const best = assessment.attempts.reduce<(typeof assessment.attempts)[number] | null>(
          (current, attempt) => {
            if (!current || Number(attempt.score ?? 0) > Number(current.score ?? 0)) return attempt;
            return current;
          },
          null,
        );
        return {
          id: assessment.id,
          title: assessment.title,
          score: best?.score != null ? Number(best.score) : null,
          maxScore,
          passed: best?.passed ?? null,
        };
      }),
    };
  }
}

type TeacherQuestionType = 'MULTIPLE_CHOICE' | 'MULTIPLE_ANSWER' | 'TRUE_FALSE' | 'SHORT_ANSWER';
