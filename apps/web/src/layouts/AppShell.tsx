import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Avatar, Breadcrumbs, Button, Dropdown, Label, Separator } from '@heroui/react';
import {
  ChevronsUpDown,
  Languages,
  LogOut,
  Moon,
  Sprout,
  Sun,
} from 'lucide-react';
import { LocaleThemeControls } from '@/components/shared/LocaleThemeControls';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTheme } from '@/features/theme/ThemeProvider';
import { initialsFromName } from '@/lib/initials';

export interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
}

function isSystemAdminRole(role: string | undefined): boolean {
  return role === 'SYSTEM_ADMIN';
}

function BrandMark({
  isSystemAdmin,
  schoolName,
  schoolLogoUrl,
}: {
  isSystemAdmin: boolean;
  schoolName: string;
  schoolLogoUrl: string | null;
}) {
  if (isSystemAdmin) {
    return (
      <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <Sprout className="size-4" aria-hidden />
      </span>
    );
  }

  return (
    <Avatar size="sm" color="accent" className="size-8 shrink-0 rounded-lg">
      {schoolLogoUrl ? <Avatar.Image src={schoolLogoUrl} alt="" /> : null}
      <Avatar.Fallback className="rounded-lg text-xs font-semibold">
        {initialsFromName(schoolName)}
      </Avatar.Fallback>
    </Avatar>
  );
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
  const { user } = useAuth();
  const location = useLocation();
  const allItems = [...items, ...moreItems];
  const current = allItems.find((item) => location.pathname === item.to) ?? allItems[0];
  const isSystemAdmin = isSystemAdminRole(user?.role);
  const schoolName = user?.schoolName || t('app.name');
  const orgLabel = isSystemAdmin ? t('app.name') : schoolName;
  const roleLabel = t(`nav.roles.${user?.role ?? 'STUDENT'}`);
  const brandSubtitle = isSystemAdmin ? t('app.tagline') : roleLabel;
  const schoolLogoUrl = user?.schoolLogoUrl ?? null;

  return (
    <div className="flex min-h-svh bg-surface text-foreground">
      <aside className="hidden w-64 shrink-0 flex-col md:flex">
        <div className="flex h-16 items-center px-3">
          <NavLink
            to={homeTo}
            className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1.5 no-underline hover:bg-overlay"
          >
            <BrandMark
              isSystemAdmin={isSystemAdmin}
              schoolName={schoolName}
              schoolLogoUrl={schoolLogoUrl}
            />
            <span className="grid min-w-0 flex-1 text-start leading-tight">
              <span className="truncate text-sm font-semibold text-foreground">{orgLabel}</span>
              <span className="truncate text-xs text-muted">{brandSubtitle}</span>
            </span>
          </NavLink>
        </div>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-2">
          <NavGroup label={t('nav.workspace')}>
            {items.map((item) => (
              <ShellLink key={item.to} item={item} />
            ))}
          </NavGroup>
          {moreItems.length > 0 ? (
            <NavGroup label={t('nav.more')}>
              {moreItems.map((item) => (
                <ShellLink key={item.to} item={item} />
              ))}
            </NavGroup>
          ) : null}
        </div>

        <div className="mt-auto p-3">
          <UserMenu />
        </div>
      </aside>

      <div className="flex min-h-svh flex-1 flex-col md:p-1">
        <div className="flex min-h-svh flex-1 flex-col bg-background md:min-h-0 md:rounded-xl md:border md:border-border md:shadow-sm">
          <header className="flex h-14 shrink-0 items-center gap-2 px-4 md:h-16 md:px-6">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <NavLink to={homeTo} className="md:hidden">
                <BrandMark
                  isSystemAdmin={isSystemAdmin}
                  schoolName={schoolName}
                  schoolLogoUrl={schoolLogoUrl}
                />
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
        {items.slice(0, 4).map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
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
  const displayName = email.split('@')[0] || t(`nav.roles.${user?.role ?? 'STUDENT'}`);
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
      <Dropdown.Popover
        placement="top start"
        className="min-w-56"
        dir={isArabic ? 'rtl' : 'ltr'}
      >
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
            {resolved === 'dark' ? <Sun className="size-4 shrink-0" aria-hidden /> : <Moon className="size-4 shrink-0" aria-hidden />}
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
