import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@heroui/react';
import { Sprout } from 'lucide-react';
import { LocaleThemeControls } from '@/components/LocaleThemeControls';

const WEB_URL = import.meta.env.VITE_WEB_URL ?? 'http://localhost:5173';

const links = [
  { to: '/', labelKey: 'marketing.nav.home', end: true },
  { to: '/features', labelKey: 'marketing.nav.features' },
  { to: '/for-schools', labelKey: 'marketing.nav.forSchools' },
  { to: '/pricing', labelKey: 'marketing.nav.pricing' },
  { to: '/contact', labelKey: 'marketing.nav.contact' },
] as const;

export function SiteLayout() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2 no-underline text-foreground">
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Sprout className="size-4" aria-hidden />
            </span>
            <span className="font-semibold">{t('app.name')}</span>
          </NavLink>
          <nav className="ms-auto hidden items-center gap-1 md:flex">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={'end' in link ? link.end : false}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-1.5 text-sm no-underline ${
                    isActive ? 'bg-accent/10 font-medium text-accent' : 'text-muted hover:text-foreground'
                  }`
                }
              >
                {t(link.labelKey)}
              </NavLink>
            ))}
          </nav>
          <LocaleThemeControls />
          <Button
            size="sm"
            variant="primary"
            onPress={() => {
              window.location.href = `${WEB_URL}/login`;
            }}
          >
            {t('auth.login')}
          </Button>
        </div>
        <nav className="flex gap-1 overflow-x-auto border-t border-border px-2 py-2 md:hidden">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={'end' in link ? link.end : false}
              className={({ isActive }) =>
                `shrink-0 rounded-lg px-3 py-1.5 text-xs no-underline ${
                  isActive ? 'bg-accent/10 font-medium text-accent' : 'text-muted'
                }`
              }
            >
              {t(link.labelKey)}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10">
        <Outlet />
      </main>
      <footer className="border-t border-border py-6 text-center text-sm text-muted">
        {t('app.copyright', { year, name: t('app.name') })}
      </footer>
    </div>
  );
}
