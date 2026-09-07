import { TeacherService } from '../src/modules/teacher/teacher.service';
import type { AuthUser } from '@nabta/types';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

const teacherUser: AuthUser = {
  id: 'user-t',
  email: 'teacher@nabta.local',
  role: 'TEACHER',
  schoolId: 'school-a',
  schoolName: 'Egyptian International School',
  schoolLogoUrl: null,
  locale: 'en',
  theme: 'system',
  status: 'active',
};

const teacherRow = {
  id: 't-1',
  schoolId: 'school-a',
  givenName: 'Nadia',
  familyName: 'Hassan',
  teachingAssignments: [{ classId: 'c1', subjectId: 'math' }],
};

describe('TeacherService isolation', () => {
  it('loads the teacher profile for the caller school only', async () => {
    const findFirst = jest.fn().mockResolvedValue(teacherRow);
    const prisma = { teacher: { findFirst } };
    const service = new TeacherService(prisma as never, { getUploadUrl: jest.fn() } as never);
    const me = await service.getMe(teacherUser);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-t', schoolId: 'school-a' },
      }),
    );
    expect(me.givenName).toBe('Nadia');
  });

  it('refuses callers without a school', async () => {
    const service = new TeacherService({} as never, { getUploadUrl: jest.fn() } as never);
    await expect(service.getMe({ ...teacherUser, schoolId: null })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('hides assignments outside the teaching assignment', async () => {
    const prisma = {
      teacher: { findFirst: jest.fn().mockResolvedValue(teacherRow) },
      assignment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'asg-1',
          classId: 'other-class',
          subjectId: 'math',
          schoolId: 'school-a',
          class: { name: '10B' },
          subject: { name: 'Math' },
          files: [],
          submissions: [],
        }),
      },
      teachingAssignment: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new TeacherService(prisma as never, { getUploadUrl: jest.fn() } as never);
    await expect(service.getAssignment(teacherUser, 'asg-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('grades then publish-grades returns RETURNED', async () => {
    const submission = {
      id: 'sub-1',
      assignmentId: 'asg-1',
      studentId: 'st-1',
      status: 'SUBMITTED',
      submittedAt: new Date(),
      score: null,
      feedback: null,
      gradesPublishedAt: null,
      student: { givenName: 'Omar', familyName: 'Farouk' },
      files: [],
      assignment: {
        title: 'Worksheet',
        maxScore: 100,
        classId: 'c1',
        subjectId: 'math',
      },
    };
    const prisma = {
      teacher: { findFirst: jest.fn().mockResolvedValue(teacherRow) },
      teachingAssignment: { findFirst: jest.fn().mockResolvedValue({ id: 'ta' }) },
      assignmentSubmission: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce(submission)
          .mockResolvedValueOnce({
            ...submission,
            status: 'GRADED',
            score: 18,
            feedback: 'Clear working.',
          }),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'sub-1',
            studentId: 'st-1',
            status: 'RETURNED',
            submittedAt: new Date(),
            score: 18,
            gradesPublishedAt: new Date(),
          },
        ]),
      },
      assignment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'asg-1',
          classId: 'c1',
          subjectId: 'math',
          schoolId: 'school-a',
          class: { name: '10A' },
          subject: { name: 'Math' },
          files: [],
        }),
      },
      enrollment: {
        findMany: jest.fn().mockResolvedValue([
          { studentId: 'st-1', student: { givenName: 'Omar', familyName: 'Farouk' } },
        ]),
      },
    };
    const storage = { getUploadUrl: jest.fn(), getObjectUrl: jest.fn().mockResolvedValue('https://file') };
    const service = new TeacherService(prisma as never, storage as never);
    const graded = await service.gradeSubmission(teacherUser, 'sub-1', { score: 18, feedback: 'Clear working.' });
    expect(prisma.assignmentSubmission.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'GRADED', score: 18 }),
      }),
    );
    expect(graded.score).toBe(18);
    const published = await service.publishGrades(teacherUser, 'asg-1');
    expect(prisma.assignmentSubmission.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'RETURNED' }),
      }),
    );
    expect(published[0]?.status).toBe('RETURNED');
  });

  it('enriches dashboard slots, activity, and attendance alerts', async () => {
    const submittedAt = new Date('2026-09-05T10:00:00.000Z');
    const prisma = {
      teacher: { findFirst: jest.fn().mockResolvedValue(teacherRow) },
      timetableSlot: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'slot-1',
            weekday: 1,
            startsAt: '09:00',
            endsAt: '10:00',
            room: '204',
            classId: 'c1',
            subjectId: 'math',
            class: { name: '10A' },
            subject: { name: 'Mathematics' },
          },
        ]),
      },
      assignment: { findMany: jest.fn().mockResolvedValue([]) },
      attendanceSession: { findMany: jest.fn().mockResolvedValue([]) },
      assignmentSubmission: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'sub-1',
            submittedAt,
            student: { givenName: 'Sara', familyName: 'Ahmed' },
            assignment: {
              title: 'Algebra Practice',
              classId: 'c1',
              subjectId: 'math',
              class: { name: '10A' },
              subject: { name: 'Mathematics' },
            },
          },
        ]),
      },
      assessmentAttempt: { findMany: jest.fn().mockResolvedValue([]) },
      enrollment: {
        groupBy: jest.fn().mockResolvedValue([{ classId: 'c1', _count: { _all: 24 } }]),
        findMany: jest.fn().mockResolvedValue([]),
      },
      lesson: { findMany: jest.fn().mockResolvedValue([]) },
      lessonProgress: { findMany: jest.fn().mockResolvedValue([]) },
      assessment: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new TeacherService(prisma as never, { getUploadUrl: jest.fn() } as never);
    const dash = await service.getDashboard(teacherUser);
    expect(dash.schedule[0]).toMatchObject({
      studentCount: 24,
      attendanceTaken: false,
      room: '204',
    });
    expect(dash.alerts.some((alert) => alert.kind === 'attendance_incomplete')).toBe(true);
    expect(dash.recentActivity[0]).toMatchObject({
      kind: 'submission',
      title: 'Algebra Practice',
      studentName: 'Sara Ahmed',
    });
  });

  it('enriches the class list from enrollments, timetable, and pending work', async () => {
    const prisma = {
      teacher: { findFirst: jest.fn().mockResolvedValue(teacherRow) },
      teachingAssignment: {
        findMany: jest.fn().mockResolvedValue([
          {
            classId: 'c1',
            subjectId: 'math',
            class: { name: '10A' },
            subject: { name: 'Mathematics', code: 'MATH-10-A' },
          },
        ]),
      },
      enrollment: {
        groupBy: jest.fn().mockResolvedValue([{ classId: 'c1', _count: { _all: 24 } }]),
      },
      timetableSlot: {
        findMany: jest.fn().mockResolvedValue([
          { classId: 'c1', subjectId: 'math', weekday: 0, startsAt: '09:00', endsAt: '10:00', room: '204' },
          { classId: 'c1', subjectId: 'math', weekday: 2, startsAt: '09:00', endsAt: '10:00', room: '204' },
          {
            classId: 'c1',
            subjectId: 'math',
            weekday: new Date().getDay(),
            startsAt: '09:00',
            endsAt: '10:00',
            room: '204',
          },
        ]),
      },
      assignment: {
        findMany: jest.fn().mockResolvedValue([
          { classId: 'c1', subjectId: 'math', submissions: [{ id: 's1' }, { id: 's2' }] },
        ]),
      },
      assessment: {
        groupBy: jest
          .fn()
          .mockResolvedValue([{ classId: 'c1', subjectId: 'math', _count: { _all: 1 } }]),
      },
      attendanceSession: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new TeacherService(prisma as never, { getUploadUrl: jest.fn() } as never);
    const classes = await service.listClasses(teacherUser);
    expect(classes[0]).toMatchObject({
      subjectCode: 'MATH-10-A',
      studentCount: 24,
      pendingCount: 2,
      publishedQuizCount: 1,
      attendanceTakenToday: false,
    });
    expect(classes[0]?.schedule.length).toBeGreaterThanOrEqual(2);
  });

  it('splits assignment submissions into pending, submitted, and graded counts', async () => {
    const prisma = {
      teacher: {
        findFirst: jest.fn().mockResolvedValue({
          ...teacherRow,
          teachingAssignments: [{ classId: 'c1', subjectId: 'math' }],
        }),
      },
      assignment: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'asg-1',
            title: 'Algebra Practice',
            dueAt: new Date('2026-09-10T12:00:00.000Z'),
            publishedAt: new Date('2026-09-01T08:00:00.000Z'),
            classId: 'c1',
            subjectId: 'math',
            class: { name: '10A' },
            subject: { name: 'Mathematics' },
            submissions: [
              { status: 'DRAFT' },
              { status: 'SUBMITTED' },
              { status: 'LATE' },
              { status: 'GRADED' },
              { status: 'RETURNED' },
            ],
          },
        ]),
      },
    };
    const service = new TeacherService(prisma as never, { getUploadUrl: jest.fn() } as never);
    const assignments = await service.listAssignments(teacherUser);
    expect(assignments[0]).toMatchObject({
      pendingCount: 2,
      submissionCount: 4,
      gradedCount: 2,
    });
  });

  it('summarises attendance history by status for the class pair', async () => {
    const prisma = {
      teacher: { findFirst: jest.fn().mockResolvedValue(teacherRow) },
      teachingAssignment: { findFirst: jest.fn().mockResolvedValue({ id: 'ta' }) },
      attendanceSession: {
        findMany: jest.fn().mockResolvedValue([
          {
            takenOn: new Date('2026-09-04T00:00:00.000Z'),
            records: [
              { status: 'PRESENT' },
              { status: 'PRESENT' },
              { status: 'ABSENT' },
              { status: 'LATE' },
              { status: 'EXCUSED' },
            ],
          },
        ]),
      },
    };
    const service = new TeacherService(prisma as never, { getUploadUrl: jest.fn() } as never);
    const history = await service.getAttendanceHistory(teacherUser, {
      classId: '11111111-1111-4111-8111-111111111111',
      subjectId: '22222222-2222-4222-8222-222222222222',
    });
    expect(history[0]).toEqual({
      date: '2026-09-04',
      present: 2,
      absent: 1,
      late: 1,
      excused: 1,
      total: 5,
    });
  });

  it('lists class materials with download URLs', async () => {
    const prisma = {
      teacher: { findFirst: jest.fn().mockResolvedValue(teacherRow) },
      teachingAssignment: { findFirst: jest.fn().mockResolvedValue({ id: 'ta' }) },
      learningMaterial: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'mat-1',
            fileName: 'notes.pdf',
            mimeType: 'application/pdf',
            size: 1024,
            createdAt: new Date('2026-09-05T08:00:00.000Z'),
            updatedAt: new Date('2026-09-06T08:00:00.000Z'),
            storageKey: 'school-a/materials/math/lesson-1/notes.pdf',
            url: null,
            lessonId: 'lesson-1',
            lesson: { title: 'Algebra', unit: { id: 'unit-1', title: 'Unit 1' } },
          },
        ]),
      },
    };
    const storage = {
      getUploadUrl: jest.fn(),
      getObjectUrl: jest.fn().mockResolvedValue('https://files/notes.pdf'),
    };
    const service = new TeacherService(prisma as never, storage as never);
    const materials = await service.listMaterials(teacherUser, 'c1', 'math');
    expect(storage.getObjectUrl).toHaveBeenCalledWith('school-a/materials/math/lesson-1/notes.pdf');
    expect(materials[0]).toMatchObject({
      fileName: 'notes.pdf',
      downloadUrl: 'https://files/notes.pdf',
      url: null,
      lessonTitle: 'Algebra',
      unitId: 'unit-1',
      unitTitle: 'Unit 1',
      updatedAt: '2026-09-06T08:00:00.000Z',
    });
  });

  it('adds a link material without object storage', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'mat-link' });
    const prisma = {
      teacher: { findFirst: jest.fn().mockResolvedValue(teacherRow) },
      lesson: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'lesson-1',
          unitId: 'unit-1',
          unit: { classId: 'c1', subjectId: 'math' },
          materials: [],
        }),
      },
      teachingAssignment: { findFirst: jest.fn().mockResolvedValue({ id: 'ta' }) },
      learningMaterial: { create },
    };
    const service = new TeacherService(prisma as never, { getUploadUrl: jest.fn() } as never);
    await service.addMaterial(teacherUser, 'lesson-1', {
      fileName: 'Khan Academy',
      url: 'https://www.khanacademy.org/forces',
    });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fileName: 'Khan Academy',
        url: 'https://www.khanacademy.org/forces',
        storageKey: null,
        size: 0,
        mimeType: 'text/uri-list',
      }),
    });
  });

  it('moves a material to another lesson in the same class', async () => {
    const update = jest.fn().mockResolvedValue({ id: 'mat-1' });
    const prisma = {
      teacher: { findFirst: jest.fn().mockResolvedValue(teacherRow) },
      teachingAssignment: { findFirst: jest.fn().mockResolvedValue({ id: 'ta' }) },
      learningMaterial: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'mat-1',
          lessonId: 'lesson-1',
          url: null,
          lesson: { unit: { classId: 'c1', subjectId: 'math' } },
        }),
        update,
      },
      lesson: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'lesson-2',
          unit: { classId: 'c1', subjectId: 'math' },
          materials: [],
        }),
      },
    };
    const service = new TeacherService(prisma as never, { getUploadUrl: jest.fn() } as never);
    await service.updateMaterial(teacherUser, 'mat-1', {
      lessonId: '22222222-2222-4222-8222-222222222222',
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'mat-1' },
      data: { lessonId: 'lesson-2' },
    });
  });

  it('deletes a file material and removes the stored object', async () => {
    const prisma = {
      teacher: { findFirst: jest.fn().mockResolvedValue(teacherRow) },
      teachingAssignment: { findFirst: jest.fn().mockResolvedValue({ id: 'ta' }) },
      learningMaterial: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'mat-1',
          storageKey: 'school-a/materials/math/lesson-1/notes.pdf',
          lesson: { unit: { classId: 'c1', subjectId: 'math' } },
        }),
        delete: jest.fn().mockResolvedValue({}),
      },
    };
    const storage = {
      getUploadUrl: jest.fn(),
      deleteObject: jest.fn().mockResolvedValue(undefined),
    };
    const service = new TeacherService(prisma as never, storage as never);
    await service.deleteMaterial(teacherUser, 'mat-1');
    expect(storage.deleteObject).toHaveBeenCalledWith('school-a/materials/math/lesson-1/notes.pdf');
    expect(prisma.learningMaterial.delete).toHaveBeenCalledWith({ where: { id: 'mat-1' } });
  });

  it('refuses to publish an untitled assignment', async () => {
    const prisma = {
      teacher: { findFirst: jest.fn().mockResolvedValue(teacherRow) },
      teachingAssignment: { findFirst: jest.fn().mockResolvedValue({ id: 'ta' }) },
      assignment: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'asg-1',
          classId: 'c1',
          subjectId: 'math',
          schoolId: 'school-a',
          title: 'Untitled assignment',
          instructions: '<p>Complete the worksheet.</p>',
          class: { name: '10A' },
          subject: { name: 'Math' },
          files: [],
          submissions: [],
        }),
      },
    };
    const service = new TeacherService(prisma as never, { getUploadUrl: jest.fn() } as never);
    await expect(service.publishAssignment(teacherUser, 'asg-1', {})).rejects.toThrow(
      'Add an assignment title.',
    );
  });
});
