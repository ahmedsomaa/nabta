import { useTranslation } from 'react-i18next';
import { Button, Card } from '@heroui/react';
import { Section } from '@/components/PageContainer';
import { scrollToId } from '@/lib/scroll';

export function PricingSection() {
  const { t } = useTranslation();
  return (
    <Section id="pricing">
      <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{t('marketing.pricing.title')}</h2>
      <p className="mt-2 max-w-2xl text-muted">{t('marketing.pricing.heroBody')}</p>
      <Card className="mt-8 max-w-lg p-6">
        <Card.Header>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            {t('marketing.pricing.heroVisualLabel')}
          </p>
          <Card.Title>{t('marketing.pricing.cardTitle')}</Card.Title>
          <Card.Description>{t('marketing.pricing.cardBody')}</Card.Description>
        </Card.Header>
        <div className="mt-4">
          <Button variant="primary" onPress={() => scrollToId('contact')}>
            {t('marketing.pricing.cta')}
          </Button>
        </div>
      </Card>
    </Section>
  );
}
