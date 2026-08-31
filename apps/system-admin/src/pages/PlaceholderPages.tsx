import { useTranslation } from 'react-i18next';
import { Card } from '@heroui/react';

export function OverviewPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('platform.overviewTitle')}</h1>
      <Card className="p-5">
        <Card.Header>
          <Card.Description>{t('platform.overviewBody')}</Card.Description>
        </Card.Header>
      </Card>
    </div>
  );
}

export function SchoolsPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('platform.schoolsTitle')}</h1>
      <Card className="p-5">
        <Card.Header>
          <Card.Description>{t('platform.schoolsBody')}</Card.Description>
        </Card.Header>
      </Card>
    </div>
  );
}

export function SystemPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">{t('platform.systemTitle')}</h1>
      <Card className="p-5">
        <Card.Header>
          <Card.Description>{t('platform.systemBody')}</Card.Description>
        </Card.Header>
      </Card>
    </div>
  );
}
