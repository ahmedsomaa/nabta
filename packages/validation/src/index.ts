import { z } from 'zod';

export const registerSchema = z.object({
  schoolName: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const optionalUuid = z.string().uuid().optional();
const optionalDate = z.coerce.date().optional().nullable();

export const createAcademicYearSchema = z.object({
  name: z.string().min(3).max(40),
  startsOn: optionalDate,
  endsOn: optionalDate,
});

export const updateAcademicYearSchema = createAcademicYearSchema.partial();

export const listAcademicYearsQuerySchema = paginationQuerySchema;

export const createGradeSchema = z.object({
  academicYearId: z.string().uuid(),
  name: z.string().min(1).max(80),
  level: z.number().int().min(1).max(12),
});

export const updateGradeSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  level: z.number().int().min(1).max(12).optional(),
});

export const listGradesQuerySchema = paginationQuerySchema.extend({
  academicYearId: optionalUuid,
});

export const createClassSchema = z.object({
  gradeId: z.string().uuid(),
  name: z.string().min(1).max(40),
});

export const updateClassSchema = z.object({
  name: z.string().min(1).max(40).optional(),
});

export const listClassesQuerySchema = paginationQuerySchema.extend({
  gradeId: optionalUuid,
});

export const createSubjectSchema = z.object({
  name: z.string().min(1).max(120),
  code: z.string().min(1).max(20).optional().nullable(),
  gradeId: z.string().uuid().optional().nullable(),
});

export const updateSubjectSchema = createSubjectSchema.partial();

export const listSubjectsQuerySchema = paginationQuerySchema.extend({
  gradeId: optionalUuid,
});

export const createStudentSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  givenName: z.string().min(1).max(80),
  familyName: z.string().min(1).max(80),
});

export const updateStudentSchema = z.object({
  givenName: z.string().min(1).max(80).optional(),
  familyName: z.string().min(1).max(80).optional(),
});

export const listStudentsQuerySchema = paginationQuerySchema;

export const createTeacherSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  givenName: z.string().min(1).max(80),
  familyName: z.string().min(1).max(80),
});

export const updateTeacherSchema = z.object({
  givenName: z.string().min(1).max(80).optional(),
  familyName: z.string().min(1).max(80).optional(),
});

export const listTeachersQuerySchema = paginationQuerySchema;

export const createEnrollmentSchema = z.object({
  studentId: z.string().uuid(),
});

export const createTeachingAssignmentSchema = z.object({
  teacherId: z.string().uuid(),
  subjectId: z.string().uuid(),
  classId: z.string().uuid(),
});

export const marketingContactSchema = z.object({
  name: z.string().min(1).max(120),
  email: z.string().email(),
  message: z.string().min(10).max(4000),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CreateAcademicYearInput = z.infer<typeof createAcademicYearSchema>;
export type UpdateAcademicYearInput = z.infer<typeof updateAcademicYearSchema>;
export type CreateGradeInput = z.infer<typeof createGradeSchema>;
export type UpdateGradeInput = z.infer<typeof updateGradeSchema>;
export type CreateClassInput = z.infer<typeof createClassSchema>;
export type UpdateClassInput = z.infer<typeof updateClassSchema>;
export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;
export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;
export type UpdateTeacherInput = z.infer<typeof updateTeacherSchema>;
export type CreateEnrollmentInput = z.infer<typeof createEnrollmentSchema>;
export type CreateTeachingAssignmentInput = z.infer<typeof createTeachingAssignmentSchema>;
export const lessonProgressSchema = z.object({
  completed: z.boolean().optional(),
});

export const filePresignSchema = z.object({
  purpose: z.literal('submission'),
  assignmentId: z.string().uuid(),
  mimeType: z.string().min(1).max(120),
  size: z.number().int().min(1).max(10 * 1024 * 1024),
  fileName: z.string().min(1).max(180),
});

export const assignmentDraftSchema = z.object({
  storageKey: z.string().min(1).max(500),
  mimeType: z.string().min(1).max(120),
  size: z.number().int().min(1).max(10 * 1024 * 1024),
  fileName: z.string().min(1).max(180),
});

const fileMeta = {
  mimeType: z.string().min(1).max(120),
  size: z.number().int().min(1).max(10 * 1024 * 1024),
  fileName: z.string().min(1).max(180),
};

export const teacherFilePresignSchema = z.discriminatedUnion('purpose', [
  z.object({ purpose: z.literal('material'), lessonId: z.string().uuid(), ...fileMeta }),
  z.object({ purpose: z.literal('assignment'), assignmentId: z.string().uuid(), ...fileMeta }),
]);

export const createUnitSchema = z.object({
  subjectId: z.string().uuid(),
  classId: z.string().uuid(),
  title: z.string().min(1).max(160),
});

export const updateUnitSchema = z.object({
  title: z.string().min(1).max(160),
});

export const reorderUnitsSchema = z.object({
  subjectId: z.string().uuid(),
  classId: z.string().uuid(),
  ids: z.array(z.string().uuid()).min(1),
});

export const createLessonSchema = z.object({
  unitId: z.string().uuid(),
  title: z.string().min(1).max(160),
  type: z.enum(['RICH_TEXT', 'VIDEO', 'PDF', 'IMAGE', 'EXTERNAL']),
  body: z.string().max(50_000).optional().nullable(),
  url: z.string().max(2000).optional().nullable(),
});

export const updateLessonSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  type: z.enum(['RICH_TEXT', 'VIDEO', 'PDF', 'IMAGE', 'EXTERNAL']).optional(),
  body: z.string().max(50_000).optional().nullable(),
  url: z.string().max(2000).optional().nullable(),
});

export const reorderLessonsSchema = z.object({
  unitId: z.string().uuid(),
  ids: z.array(z.string().uuid()).min(1),
});

export const lessonMaterialSchema = z.object({
  storageKey: z.string().min(1).max(500),
  fileName: z.string().min(1).max(180),
  mimeType: z.string().min(1).max(120),
  size: z.number().int().min(1).max(10 * 1024 * 1024),
});

export const createTeacherAssignmentSchema = z.object({
  classId: z.string().uuid(),
  subjectId: z.string().uuid(),
  title: z.string().min(1).max(160),
  instructions: z.string().min(1).max(20_000),
  dueAt: z.coerce.date(),
  maxScore: z.number().int().min(1).max(1000).optional(),
});

export const updateTeacherAssignmentSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  instructions: z.string().min(1).max(20_000).optional(),
  dueAt: z.coerce.date().optional(),
  maxScore: z.number().int().min(1).max(1000).optional(),
});

export const assignmentFileSchema = lessonMaterialSchema;

export const gradeSubmissionSchema = z.object({
  score: z.number().min(0).max(1000),
  feedback: z.string().max(10_000).optional().nullable(),
});

export const attendanceQuerySchema = z.object({
  classId: z.string().uuid(),
  subjectId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const putAttendanceSchema = z.object({
  classId: z.string().uuid(),
  subjectId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  records: z
    .array(
      z.object({
        studentId: z.string().uuid(),
        status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']),
      }),
    )
    .min(1),
});

export const gradebookQuerySchema = z.object({
  classId: z.string().uuid(),
  subjectId: z.string().uuid(),
});

const questionTypeEnum = z.enum(['MULTIPLE_CHOICE', 'MULTIPLE_ANSWER', 'TRUE_FALSE', 'SHORT_ANSWER']);

export const createAssessmentSchema = z.object({
  classId: z.string().uuid(),
  subjectId: z.string().uuid(),
  unitId: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(160),
  instructions: z.string().max(20_000).optional(),
  timeLimitMinutes: z.number().int().min(1).max(240).optional().nullable(),
  maxAttempts: z.number().int().min(1).max(20).optional(),
  passingScore: z.number().int().min(0).max(100).optional(),
  randomizeQuestions: z.boolean().optional(),
});

export const updateAssessmentSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  instructions: z.string().max(20_000).optional(),
  unitId: z.string().uuid().optional().nullable(),
  timeLimitMinutes: z.number().int().min(1).max(240).optional().nullable(),
  maxAttempts: z.number().int().min(1).max(20).optional(),
  passingScore: z.number().int().min(0).max(100).optional(),
  randomizeQuestions: z.boolean().optional(),
});

export const createQuestionSchema = z.object({
  type: questionTypeEnum,
  prompt: z.string().min(1).max(4000),
  points: z.number().int().min(1).max(100).optional(),
  feedback: z.string().max(4000).optional().nullable(),
  options: z
    .array(
      z.object({
        text: z.string().min(1).max(500),
        isCorrect: z.boolean().optional(),
      }),
    )
    .optional(),
});

export const updateQuestionSchema = z.object({
  prompt: z.string().min(1).max(4000).optional(),
  points: z.number().int().min(1).max(100).optional(),
  feedback: z.string().max(4000).optional().nullable(),
  type: questionTypeEnum.optional(),
});

export const reorderQuestionsSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

export const createQuestionOptionSchema = z.object({
  text: z.string().min(1).max(500),
  isCorrect: z.boolean().optional(),
});

export const updateQuestionOptionSchema = z.object({
  text: z.string().min(1).max(500).optional(),
  isCorrect: z.boolean().optional(),
});

export const saveAttemptAnswerSchema = z.object({
  questionId: z.string().uuid(),
  optionIds: z.array(z.string().uuid()).optional(),
  textAnswer: z.string().max(2000).optional().nullable(),
});

export type LessonProgressInput = z.infer<typeof lessonProgressSchema>;
export type FilePresignInput = z.infer<typeof filePresignSchema>;
export type AssignmentDraftInput = z.infer<typeof assignmentDraftSchema>;
