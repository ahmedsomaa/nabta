import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { letterFromPercent } from './scoring';

@Injectable()
export class GradeRecordService {
  constructor(private readonly prisma: PrismaService) {}

  async recompute(
    schoolId: string,
    studentId: string,
    classId: string,
    subjectId: string,
  ): Promise<void> {
    const [assignments, assessments] = await Promise.all([
      this.prisma.assignment.findMany({
        where: { schoolId, classId, subjectId, publishedAt: { not: null } },
        include: {
          submissions: {
            where: { studentId, gradesPublishedAt: { not: null }, score: { not: null } },
          },
        },
      }),
      this.prisma.assessment.findMany({
        where: { schoolId, classId, subjectId, publishedAt: { not: null } },
        include: {
          attempts: {
            where: { studentId, status: { in: ['SUBMITTED', 'EXPIRED'] }, score: { not: null } },
          },
          questions: { select: { points: true } },
        },
      }),
    ]);

    const percents: number[] = [];
    for (const assignment of assignments) {
      const submission = assignment.submissions[0];
      if (!submission?.score) continue;
      percents.push((Number(submission.score) / assignment.maxScore) * 100);
    }
    for (const assessment of assessments) {
      const maxScore = assessment.questions.reduce((sum, question) => sum + question.points, 0);
      if (maxScore <= 0) continue;
      const best = assessment.attempts.reduce<number | null>((current, attempt) => {
        const value = Number(attempt.score);
        if (current == null || value > current) return value;
        return current;
      }, null);
      if (best == null) continue;
      percents.push((best / maxScore) * 100);
    }

    if (percents.length === 0) {
      await this.prisma.gradeRecord.deleteMany({ where: { studentId, classId, subjectId } });
      return;
    }

    const percentage = Math.round((percents.reduce((sum, value) => sum + value, 0) / percents.length) * 100) / 100;
    const letter = letterFromPercent(percentage);
    await this.prisma.gradeRecord.upsert({
      where: { studentId_classId_subjectId: { studentId, classId, subjectId } },
      update: { percentage, letter, schoolId },
      create: { schoolId, studentId, classId, subjectId, percentage, letter },
    });
  }

  async recomputeForAssignment(schoolId: string, classId: string, subjectId: string, studentIds: string[]) {
    await Promise.all(studentIds.map((studentId) => this.recompute(schoolId, studentId, classId, subjectId)));
  }
}
