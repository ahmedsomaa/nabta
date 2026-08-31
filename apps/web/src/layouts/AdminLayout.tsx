import { AppShell } from './AppShell';

export function AdminLayout() {
  return (
    <AppShell
      homeTo="/admin/dashboard"
      items={[
        { to: '/admin/dashboard', labelKey: 'nav.overview' },
        { to: '/admin/users', labelKey: 'nav.users' },
        { to: '/admin/academics', labelKey: 'nav.academics' },
        { to: '/admin/reports', labelKey: 'nav.reports' },
      ]}
      moreItems={[{ to: '/admin/settings', labelKey: 'nav.settings' }]}
    />
  );
}
