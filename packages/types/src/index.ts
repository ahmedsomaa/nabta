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
