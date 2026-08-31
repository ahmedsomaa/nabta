export type UserRole = 'STUDENT' | 'TEACHER' | 'ADMIN';
export type UserStatus = 'active' | 'disabled';
export type Locale = 'en' | 'ar';
export type ThemePreference = 'light' | 'dark' | 'system';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  schoolId: string;
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

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
