import { Card } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/AuthProvider';

export function PlaceholderPage({ titleKey: _titleKey }: { titleKey: string }) {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <div className="space-y-4">
      <Card className="p-5 md:p-6">
        <Card.Header>
          <Card.Title>{t('dashboard.welcome', { email: user?.email ?? '' })}</Card.Title>
          <Card.Description>{t('app.comingSoon')}</Card.Description>
        </Card.Header>
      </Card>
    </div>
  );
}
