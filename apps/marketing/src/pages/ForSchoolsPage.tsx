import { useTranslation } from 'react-i18next';

export function ForSchoolsPage() {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">{t('marketing.forSchools.title')}</h1>
      <p className="max-w-2xl text-muted">{t('marketing.forSchools.body')}</p>
      <ul className="list-disc space-y-2 ps-5 text-foreground">
        <li>{t('marketing.forSchools.points.egypt')}</li>
        <li>{t('marketing.forSchools.points.curriculum')}</li>
        <li>{t('marketing.forSchools.points.bilingual')}</li>
      </ul>
    </div>
  );
}
