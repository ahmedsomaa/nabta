import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@heroui/react';
import { Building2, LayoutDashboard, Server, Sprout } from 'lucide-react';
import { LocaleThemeControls } from '@/components/LocaleThemeControls';
import { useAuth } from '@/features/auth/AuthProvider';

const items = [
  { to: '/', labelKey: 'platform.nav.overview', icon: LayoutDashboard, end: true },
  { to: '/schools', labelKey: 'platform.nav.schools', icon: Building2 },
  { to: '/system', labelKey: 'platform.nav.system', icon: Server },
] as const;

export function PlatformShell() {
  const { t } = useTranslation();
  const { logout, user } = useAuth();

  return (
    <div className="flex min-h-svh bg-surface text-foreground">
      <aside className="hidden w-64 shrink-0 flex-col border-e border-border md:flex">
        <div className="flex h-16 items-center gap-2 px-4">
          <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <Sprout className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold">{t('app.name')}</p>
            <p className="truncate text-xs text-muted">{t('nav.roles.SYSTEM_ADMIN')}</p>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={'end' in item ? item.end : false}
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-lg px-2 py-2 text-sm no-underline ${
                    isActive ? 'bg-accent/10 font-medium text-accent' : 'text-foreground hover:bg-overlay'
                  }`
                }
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {t(item.labelKey)}
              </NavLink>
            );
          })}
        </nav>
        <div className="space-y-2 border-t border-border p-3">
          <p className="truncate px-2 text-xs text-muted">{user?.email}</p>
          <Button size="sm" variant="ghost" className="w-full justify-start" onPress={() => void logout()}>
            {t('nav.logout')}
          </Button>
        </div>
      </aside>
      <div className="flex min-h-svh flex-1 flex-col bg-background">
        <header className="flex h-14 items-center justify-between gap-2 border-b border-border px-4 md:px-6">
          <p className="text-sm font-medium md:hidden">{t('app.name')}</p>
          <div className="ms-auto">
            <LocaleThemeControls />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
