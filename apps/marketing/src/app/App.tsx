import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@/features/theme/ThemeProvider';
import { SiteLayout } from '@/components/SiteLayout';
import { HomePage } from '@/pages/HomePage';
import { FeaturesPage } from '@/pages/FeaturesPage';
import { ForSchoolsPage } from '@/pages/ForSchoolsPage';
import { PricingPage } from '@/pages/PricingPage';
import { ContactPage } from '@/pages/ContactPage';

export function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route index element={<HomePage />} />
            <Route path="features" element={<FeaturesPage />} />
            <Route path="for-schools" element={<ForSchoolsPage />} />
            <Route path="pricing" element={<PricingPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}
