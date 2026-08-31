import { useTranslation } from 'react-i18next';
import { Card } from '@heroui/react';

export function FeaturesPage() {
  const { t } = useTranslation();
  const items = ['structure', 'portals', 'i18n', 'assessment'] as const;
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">{t('marketing.features.title')}</h1>
      <p className="text-muted">{t('marketing.features.subtitle')}</p>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((key) => (
          <Card key={key} className="p-5">
            <Card.Header>
              <Card.Title>{t(`marketing.features.items.${key}.title`)}</Card.Title>
              <Card.Description>{t(`marketing.features.items.${key}.body`)}</Card.Description>
            </Card.Header>
          </Card>
        ))}
      </div>
    </div>
  );
}
