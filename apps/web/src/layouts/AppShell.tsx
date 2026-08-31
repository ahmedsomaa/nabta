import type { ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@heroui/react';
import { BrandMark } from '@/components/shared/BrandMark';
import { LocaleThemeControls } from '@/components/shared/LocaleThemeControls';
import { useAuth } from '@/features/auth/AuthProvider';

export interface NavItem {
  to: string;
  labelKey: string;
}

export function AppShell({
  items,
  moreItems = [],
  homeTo,
}: {
  items: NavItem[];
  moreItems?: NavItem[];
  homeTo: string;
}) {
  const { t } = useTranslation();
  const { logout, user } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground md:flex">
      <aside className="hidden w-64 shrink-0 border-e border-border bg-surface p-4 md:flex md:flex-col">
        <BrandMark to={homeTo} />
        <nav className="mt-6 flex flex-1 flex-col gap-1">
          {items.map((item) => (
            <ShellLink key={item.to} to={item.to}>
              {t(item.labelKey)}
            </ShellLink>
          ))}
          {moreItems.map((item) => (
            <ShellLink key={item.to} to={item.to}>
              {t(item.labelKey)}
            </ShellLink>
          ))}
        </nav>
        <div className="mt-auto space-y-3 border-t border-border pt-4">
          <p className="truncate text-sm text-muted">{user?.email}</p>
          <LocaleThemeControls />
          <Button variant="secondary" className="w-full" onPress={() => void logout()}>
            {t('nav.logout')}
          </Button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col pb-20 md:pb-0">
        <header className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
          <BrandMark to={homeTo} />
          <LocaleThemeControls />
        </header>
        <main className="flex-1 p-4 md:p-8">
          <Outlet />
        </main>
        <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-surface md:hidden">
          {items.slice(0, 4).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex-1 py-3 text-center text-xs no-underline ${isActive ? 'text-accent font-semibold' : 'text-muted'}`
              }
            >
              {t(item.labelKey)}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}

function ShellLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-lg px-3 py-2 text-sm no-underline ${
          isActive ? 'bg-accent/10 text-accent font-medium' : 'text-foreground hover:bg-overlay'
        }`
      }
    >
      {children}
    </NavLink>
  );
}
