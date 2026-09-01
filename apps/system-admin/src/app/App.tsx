import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@/features/theme/ThemeProvider';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { PlatformShell } from '@/layouts/PlatformShell';
import { RequireSystemAdmin } from '@/routes/RequireSystemAdmin';
import { LoginPage } from '@/pages/LoginPage';
import { OverviewPage } from '@/pages/OverviewPage';
import { SchoolsPage } from '@/pages/SchoolsPage';
import { SystemPage } from '@/pages/SystemPage';

const queryClient = new QueryClient();

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<RequireSystemAdmin />}>
                <Route element={<PlatformShell />}>
                  <Route index element={<OverviewPage />} />
                  <Route path="schools" element={<SchoolsPage />} />
                  <Route path="system" element={<SystemPage />} />
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
