import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@heroui/react';
import { Sprout } from 'lucide-react';
import { LocaleThemeControls } from '@/components/LocaleThemeControls';
import { MarketingFooter } from '@/components/sections/MarketingFooter';
import { hashToId, scrollToId, SECTION_IDS } from '@/lib/scroll';

const WEB_URL = import.meta.env.VITE_WEB_URL ?? 'http://localhost:5173';

const links = [
  { id: 'features', labelKey: 'marketing.nav.features' },
  { id: 'for-schools', labelKey: 'marketing.nav.forSchools' },
  { id: 'pricing', labelKey: 'marketing.nav.pricing' },
] as const;

function navClass(active: boolean, compact?: boolean) {
  const size = compact ? 'text-xs' : 'text-sm';
  return `rounded-lg px-3 py-1.5 ${size} no-underline ${
    active ? 'bg-accent/10 font-medium text-accent' : 'text-muted hover:text-foreground'
  }`;
}

export function SiteLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const id = hashToId(location.hash);
    if (!id) return;
    const timer = window.setTimeout(() => scrollToId(id), 50);
    return () => window.clearTimeout(timer);
  }, [location.hash]);

  useEffect(() => {
    const elements = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: '-96px 0px -55% 0px', threshold: [0.15, 0.35, 0.6] },
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, [location.pathname]);

  const goTop = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    history.replaceState(null, '', `${location.pathname}${location.search}`);
    setActiveId('');
  };

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <a
            href="#top"
            onClick={goTop}
            className="flex items-center gap-2 no-underline text-foreground"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Sprout className="size-4" aria-hidden />
            </span>
            <span className="font-semibold">{t('app.name')}</span>
          </a>
          <nav className="ms-auto hidden items-center gap-1 md:flex" aria-label={t('marketing.footer.product')}>
            {links.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                className={navClass(activeId === link.id)}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToId(link.id);
                  setActiveId(link.id);
                }}
              >
                {t(link.labelKey)}
              </a>
            ))}
          </nav>
          <LocaleThemeControls />
          <Button
            size="sm"
            variant="secondary"
            onPress={() => {
              window.location.href = `${WEB_URL}/login`;
            }}
          >
            {t('auth.login')}
          </Button>
          <Button size="sm" variant="primary" onPress={() => scrollToId('contact')}>
            {t('marketing.nav.demo')}
          </Button>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-border px-2 py-2 md:hidden">
          {links.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              className={`shrink-0 ${navClass(activeId === link.id, true)}`}
              onClick={(e) => {
                e.preventDefault();
                scrollToId(link.id);
                setActiveId(link.id);
              }}
            >
              {t(link.labelKey)}
            </a>
          ))}
        </nav>
      </header>
      <main className="w-full flex-1">
        <Outlet />
      </main>
      <MarketingFooter />
    </div>
  );
}
