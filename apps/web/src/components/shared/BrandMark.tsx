import { Sprout } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function BrandMark({
  to = '/',
  inverted = false,
}: {
  to?: string;
  inverted?: boolean;
}) {
  const { t } = useTranslation();

  return (
    <Link
      to={to}
      className={`inline-flex items-center gap-2 font-semibold no-underline ${
        inverted ? 'text-accent-foreground' : 'text-foreground'
      }`}
    >
      <Sprout className={`size-6 ${inverted ? 'text-accent-foreground' : 'text-accent'}`} aria-hidden />
      <span>{t('app.name')}</span>
    </Link>
  );
}
