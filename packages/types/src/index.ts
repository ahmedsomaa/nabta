export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN' | 'SYSTEM_ADMIN';
export type UserStatus = 'active' | 'disabled';
export type Locale = 'en' | 'ar';
export type ThemePreference = 'light' | 'dark' | 'system';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  schoolId: string | null;
  schoolName: string;
  schoolLogoUrl: string | null;
  locale: Locale;
  theme: ThemePreference;
  status: UserStatus;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface ApiSuccess<T> {
  data: T;
}

export interface ApiListMeta {
  page: number;
  limit: number;
  total: number;
}

export interface ApiListSuccess<T> {
  data: T[];
  meta: ApiListMeta;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface AcademicYear {
  id: string;
  schoolId: string;
  name: string;
  startsOn: string | null;
  endsOn: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Grade {
  id: string;
  schoolId: string;
  academicYearId: string;
  name: string;
  level: number;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolClass {
  id: string;
  schoolId: string;
  gradeId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: string;
  schoolId: string;
  gradeId: string | null;
  name: string;
  code: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentProfile {
  id: string;
  schoolId: string;
  userId: string;
  givenName: string;
  familyName: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeacherProfile {
  id: string;
  schoolId: string;
  userId: string;
  givenName: string;
  familyName: string;
  createdAt: string;
  updatedAt: string;
}

export interface Enrollment {
  id: string;
  schoolId: string;
  studentId: string;
  classId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TeachingAssignment {
  id: string;
  schoolId: string;
  teacherId: string;
  subjectId: string;
  classId: string;
  createdAt: string;
  updatedAt: string;
}

export type LessonType = 'RICH_TEXT' | 'VIDEO' | 'PDF' | 'IMAGE' | 'EXTERNAL';
export type SubmissionStatus = 'DRAFT' | 'SUBMITTED' | 'LATE' | 'GRADED' | 'RETURNED';
export type StudentAssignmentStatus = 'NOT_STARTED' | SubmissionStatus;

export interface StudentMe {
  id: string;
  givenName: string;
  familyName: string;
  classId: string | null;
  className: string | null;
}

export interface TimetableSlotView {
  id: string;
  weekday: number;
  startsAt: string;
  endsAt: string;
  room: string | null;
  subjectId: string;
  subjectName: string;
}

export interface UpcomingAssignment {
  id: string;
  title: string;
  dueAt: string;
  subjectName: string;
  status: StudentAssignmentStatus;
}

export interface ContinueLearning {
  lessonId: string;
  lessonTitle: string;
  subjectId: string;
  subjectName: string;
}

export interface StudentDashboard {
  schedule: TimetableSlotView[];
  upcoming: UpcomingAssignment[];
  continueLearning: ContinueLearning | null;
  overview: { submitted: number; total: number };
}

export interface StudentSubjectListItem {
  id: string;
  name: string;
  code: string | null;
  teacherName: string | null;
  className: string;
  progressPercent: number;
}

export interface StudentLessonSummary {
  id: string;
  title: string;
  type: LessonType;
  sortOrder: number;
  completed: boolean;
}

export interface StudentUnit {
  id: string;
  title: string;
  sortOrder: number;
  lessons: StudentLessonSummary[];
}

export interface StudentSubjectDetail {
  id: string;
  name: string;
  code: string | null;
  teacherName: string | null;
  className: string;
  progressPercent: number;
  units: StudentUnit[];
  assignments: UpcomingAssignment[];
}

export interface StudentLessonDetail {
  id: string;
  subjectId: string;
  unitId: string;
  title: string;
  type: LessonType;
  body: string | null;
  url: string | null;
  completed: boolean;
  units: StudentUnit[];
}

export interface StudentAssignmentDetail {
  id: string;
  title: string;
  instructions: string;
  dueAt: string;
  subjectId: string;
  subjectName: string;
  status: StudentAssignmentStatus;
  canSubmit: boolean;
  files: { id: string; fileName: string; mimeType: string; size: number }[];
}

export interface FilePresignResult {
  storageKey: string;
  uploadUrl: string;
}
