import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@/features/theme/ThemeProvider';
import { SiteLayout } from '@/components/SiteLayout';
import { HomePage } from '@/pages/HomePage';

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route index element={<HomePage />} />
            <Route path="features" element={<Navigate to={{ pathname: '/', hash: 'features' }} replace />} />
            <Route path="for-schools" element={<Navigate to={{ pathname: '/', hash: 'for-schools' }} replace />} />
            <Route path="pricing" element={<Navigate to={{ pathname: '/', hash: 'pricing' }} replace />} />
            <Route path="contact" element={<Navigate to={{ pathname: '/', hash: 'contact' }} replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
