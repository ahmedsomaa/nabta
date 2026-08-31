import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Avatar, Breadcrumbs, Button, Dropdown, Label, Separator } from '@heroui/react';
import {
  Building2,
  ChevronsUpDown,
  Languages,
  LayoutDashboard,
  LogOut,
  Moon,
  Server,
  Sprout,
  Sun,
} from 'lucide-react';
import { LocaleThemeControls } from '@/components/LocaleThemeControls';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTheme } from '@/features/theme/ThemeProvider';

interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  end?: boolean;
}

const items: NavItem[] = [
  { to: '/', labelKey: 'platform.nav.overview', icon: LayoutDashboard, end: true },
  { to: '/schools', labelKey: 'platform.nav.schools', icon: Building2 },
  { to: '/system', labelKey: 'platform.nav.system', icon: Server },
];

function BrandMark() {
  return (
    <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
      <Sprout className="size-4" aria-hidden />
    </span>
  );
}

export function PlatformShell() {
  const { t } = useTranslation();
  const location = useLocation();
  const current =
    items.find((item) =>
      item.end ? location.pathname === item.to : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`),
    ) ?? items[0];
  const roleLabel = t('nav.roles.SYSTEM_ADMIN');

  return (
    <div className="flex min-h-svh bg-surface text-foreground">
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col md:flex">
        <div className="flex h-16 items-center px-3">
          <NavLink
            to="/"
            className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 no-underline hover:bg-overlay"
          >
            <BrandMark />
            <span className="grid min-w-0 flex-1 text-start leading-tight">
              <span className="truncate text-sm font-semibold text-foreground">{t('app.name')}</span>
              <span className="truncate text-xs text-muted">{t('app.tagline')}</span>
            </span>
          </NavLink>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-3 py-2">
          <NavGroup label={t('nav.workspace')}>
            {items.map((item) => (
              <ShellLink key={item.to} item={item} />
            ))}
          </NavGroup>
        </div>

        <div className="mt-auto shrink-0 p-3">
          <UserMenu />
        </div>
      </aside>

      <div className="flex min-h-svh flex-1 flex-col md:p-1">
        <div className="flex min-h-svh flex-1 flex-col bg-background md:min-h-0 md:rounded-xl md:border md:border-border md:shadow-sm">
          <header className="flex h-14 shrink-0 items-center gap-2 px-4 md:h-16 md:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <NavLink to="/" className="md:hidden">
                <BrandMark />
              </NavLink>
              <Separator orientation="vertical" className="hidden h-4 md:block" />
              {current ? (
                <Breadcrumbs className="min-w-0">
                  <Breadcrumbs.Item>{roleLabel}</Breadcrumbs.Item>
                  <Breadcrumbs.Item>{t(current.labelKey)}</Breadcrumbs.Item>
                </Breadcrumbs>
              ) : null}
            </div>
            <div className="md:hidden">
              <LocaleThemeControls />
            </div>
          </header>

          <main className="flex-1 p-4 pb-24 md:p-6 md:pb-6">
            <Outlet />
          </main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-background md:hidden">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] no-underline ${
                  isActive ? 'text-accent font-semibold' : 'text-muted'
                }`
              }
            >
              <Icon className="size-4" aria-hidden />
              {t(item.labelKey)}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

function NavGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="px-2 text-xs font-medium text-muted">{label}</p>
      {children}
    </div>
  );
}

function ShellLink({ item }: { item: NavItem }) {
  const { t } = useTranslation();
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        `flex items-center gap-2 rounded-lg px-2 py-2 text-sm no-underline ${
          isActive ? 'bg-accent/10 font-medium text-accent' : 'text-foreground hover:bg-overlay'
        }`
      }
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className="truncate">{t(item.labelKey)}</span>
    </NavLink>
  );
}

function UserMenu() {
  const { t, i18n } = useTranslation();
  const { logout, user } = useAuth();
  const { resolved, setTheme } = useTheme();
  const isArabic = i18n.language === 'ar' || i18n.language.startsWith('ar');
  const email = user?.email ?? '';
  const displayName = email.split('@')[0] || t('nav.roles.SYSTEM_ADMIN');
  const initials = displayName.slice(0, 2).toUpperCase();

  const toggleLocale = () => {
    const next = isArabic ? 'en' : 'ar';
    void i18n.changeLanguage(next);
    localStorage.setItem('nabta.locale', next);
    document.documentElement.lang = next;
    document.documentElement.dir = next === 'ar' ? 'rtl' : 'ltr';
  };

  return (
    <Dropdown>
      <Button
        variant="ghost"
        className="h-auto w-full justify-start gap-2 px-2 py-2"
        aria-label={t('nav.account')}
      >
        <Avatar size="sm" color="accent">
          <Avatar.Fallback>{initials}</Avatar.Fallback>
        </Avatar>
        <span className="grid min-w-0 flex-1 text-start leading-tight">
          <span className="truncate text-sm font-medium">{displayName}</span>
          <span className="truncate text-xs text-muted">{email}</span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted" aria-hidden />
      </Button>
      <Dropdown.Popover placement="top start" className="min-w-56" dir={isArabic ? 'rtl' : 'ltr'}>
        <Dropdown.Menu
          dir={isArabic ? 'rtl' : 'ltr'}
          onAction={(key) => {
            if (key === 'logout') void logout();
            if (key === 'locale') toggleLocale();
            if (key === 'theme') setTheme(resolved === 'dark' ? 'light' : 'dark');
          }}
        >
          <Dropdown.Item
            id="locale"
            textValue={isArabic ? t('locale.switchToEnglish') : t('locale.switchToArabic')}
            className="justify-start text-start"
          >
            <Languages className="size-4 shrink-0" aria-hidden />
            <Label>{isArabic ? t('locale.en') : t('locale.ar')}</Label>
          </Dropdown.Item>
          <Dropdown.Item
            id="theme"
            textValue={resolved === 'dark' ? t('theme.switchToLight') : t('theme.switchToDark')}
            className="justify-start text-start"
          >
            {resolved === 'dark' ? (
              <Sun className="size-4 shrink-0" aria-hidden />
            ) : (
              <Moon className="size-4 shrink-0" aria-hidden />
            )}
            <Label>{resolved === 'dark' ? t('theme.light') : t('theme.dark')}</Label>
          </Dropdown.Item>
          <Separator />
          <Dropdown.Item
            id="logout"
            textValue={t('nav.logout')}
            variant="danger"
            className="justify-start text-start"
          >
            <LogOut className="size-4 shrink-0 text-danger" aria-hidden />
            <Label>{t('nav.logout')}</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
