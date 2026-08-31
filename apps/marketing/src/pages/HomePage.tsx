import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Card } from '@heroui/react';

export function HomePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="space-y-10">
      <section className="space-y-4 text-center md:text-start">
        <p className="text-sm font-medium text-accent">{t('app.tagline')}</p>
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">{t('marketing.home.heroTitle')}</h1>
        <p className="mx-auto max-w-2xl text-lg text-muted md:mx-0">{t('marketing.home.heroBody')}</p>
        <div className="flex flex-wrap justify-center gap-3 md:justify-start">
          <Button variant="primary" onPress={() => navigate('/contact')}>
            {t('marketing.home.ctaDemo')}
          </Button>
          <Button variant="secondary" onPress={() => navigate('/features')}>
            {t('marketing.home.ctaFeatures')}
          </Button>
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        {(['students', 'teachers', 'admins'] as const).map((key) => (
          <Card key={key} className="p-5">
            <Card.Header>
              <Card.Title>{t(`marketing.home.cards.${key}.title`)}</Card.Title>
              <Card.Description>{t(`marketing.home.cards.${key}.body`)}</Card.Description>
            </Card.Header>
          </Card>
        ))}
      </div>
    </div>
  );
}
