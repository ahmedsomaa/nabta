import { Card } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/AuthProvider';

export function PlaceholderPage({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">{t(titleKey)}</h1>
      <Card>
        <Card.Header>
          <Card.Title>{t('dashboard.welcome', { email: user?.email ?? '' })}</Card.Title>
          <Card.Description>{t('app.comingSoon')}</Card.Description>
        </Card.Header>
      </Card>
    </div>
  );
}
