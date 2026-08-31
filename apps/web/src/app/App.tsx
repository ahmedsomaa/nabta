import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toast } from '@heroui/react';
import { AuthProvider, roleHome, useAuth } from '@/features/auth/AuthProvider';
import { ThemeProvider } from '@/features/theme/ThemeProvider';
import {
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
  ResetPasswordPage,
} from '@/features/auth/AuthPages';
import { RequireAuth } from '@/routes/RequireAuth';
import { StudentLayout } from '@/layouts/StudentLayout';
import { TeacherLayout } from '@/layouts/TeacherLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { PlaceholderPage } from '@/components/shared/PlaceholderPage';
import { StudentDashboardPage } from '@/features/student/StudentDashboardPage';
import { StudentClassesPage } from '@/features/student/StudentClassesPage';
import { StudentSubjectPage } from '@/features/student/StudentSubjectPage';
import { StudentLessonPage } from '@/features/student/StudentLessonPage';
import { StudentAssignmentsPage } from '@/features/student/StudentAssignmentsPage';
import { StudentAssignmentPage } from '@/features/student/StudentAssignmentPage';

const queryClient = new QueryClient();

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={roleHome(user.role)} replace />;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Toast.Provider placement="top end" />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              <Route element={<RequireAuth roles={['STUDENT']} />}>
                <Route path="/student" element={<StudentLayout />}>
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<StudentDashboardPage />} />
                  <Route path="classes" element={<StudentClassesPage />} />
                  <Route path="classes/:subjectId" element={<StudentSubjectPage />} />
                  <Route path="classes/:subjectId/lessons/:lessonId" element={<StudentLessonPage />} />
                  <Route path="assignments" element={<StudentAssignmentsPage />} />
                  <Route path="assignments/:id" element={<StudentAssignmentPage />} />
                  <Route path="grades" element={<PlaceholderPage titleKey="nav.grades" />} />
                </Route>
              </Route>

              <Route element={<RequireAuth roles={['TEACHER']} />}>
                <Route path="/teacher" element={<TeacherLayout />}>
                  <Route path="dashboard" element={<PlaceholderPage titleKey="dashboard.teacherTitle" />} />
                  <Route path="classes" element={<PlaceholderPage titleKey="nav.classes" />} />
                  <Route path="assignments" element={<PlaceholderPage titleKey="nav.assignments" />} />
                  <Route path="gradebook" element={<PlaceholderPage titleKey="nav.gradebook" />} />
                </Route>
              </Route>

              <Route element={<RequireAuth roles={['ADMIN']} />}>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route path="dashboard" element={<PlaceholderPage titleKey="dashboard.adminTitle" />} />
                  <Route path="users" element={<PlaceholderPage titleKey="nav.users" />} />
                  <Route path="academics" element={<PlaceholderPage titleKey="nav.academics" />} />
                  <Route path="reports" element={<PlaceholderPage titleKey="nav.reports" />} />
                  <Route path="settings" element={<PlaceholderPage titleKey="nav.settings" />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
