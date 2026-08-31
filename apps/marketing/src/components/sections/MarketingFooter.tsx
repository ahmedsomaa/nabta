import { useTranslation } from 'react-i18next';
import { Sprout } from 'lucide-react';
import { scrollToId } from '@/lib/scroll';

const links = [
  { id: 'features', labelKey: 'marketing.nav.features' },
  { id: 'for-schools', labelKey: 'marketing.nav.forSchools' },
  { id: 'pricing', labelKey: 'marketing.nav.pricing' },
  { id: 'contact', labelKey: 'marketing.nav.contact' },
] as const;

export function MarketingFooter() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-10 md:grid-cols-3">
        <div>
          <a href="#top" className="flex items-center gap-2 no-underline text-foreground">
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Sprout className="size-4" aria-hidden />
            </span>
            <span className="font-semibold">{t('app.name')}</span>
          </a>
          <p className="mt-3 text-sm text-muted">{t('marketing.footer.tagline')}</p>
        </div>
        <div>
          <p className="text-sm font-medium">{t('marketing.footer.product')}</p>
          <nav className="mt-3 flex flex-col gap-2 text-sm">
            {links.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                className="text-muted no-underline hover:text-foreground"
                onClick={(e) => {
                  e.preventDefault();
                  scrollToId(link.id);
                }}
              >
                {t(link.labelKey)}
              </a>
            ))}
          </nav>
        </div>
        <div>
          <p className="text-sm font-medium">{t('marketing.footer.legal')}</p>
          <p className="mt-3 text-sm text-muted">{t('marketing.footer.privacy')}</p>
          <p className="text-sm text-muted">{t('marketing.footer.terms')}</p>
          <a
            href={`mailto:${t('marketing.footer.contactEmail')}`}
            className="mt-3 inline-block text-sm text-accent no-underline"
          >
            {t('marketing.footer.contactEmail')}
          </a>
        </div>
      </div>
      <p className="border-t border-border py-4 text-center text-sm text-muted">
        {t('app.copyright', { year, name: t('app.name') })}
      </p>
    </footer>
  );
}
