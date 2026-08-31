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

export type LessonProgressInput = z.infer<typeof lessonProgressSchema>;
export type FilePresignInput = z.infer<typeof filePresignSchema>;
export type AssignmentDraftInput = z.infer<typeof assignmentDraftSchema>;
