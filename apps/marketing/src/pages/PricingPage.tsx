import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Card } from '@heroui/react';

export function PricingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">{t('marketing.pricing.title')}</h1>
      <Card className="max-w-lg p-6">
        <Card.Header>
          <Card.Title>{t('marketing.pricing.cardTitle')}</Card.Title>
          <Card.Description>{t('marketing.pricing.cardBody')}</Card.Description>
        </Card.Header>
        <div className="mt-4">
          <Button variant="primary" onPress={() => navigate('/contact')}>
            {t('marketing.pricing.cta')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
