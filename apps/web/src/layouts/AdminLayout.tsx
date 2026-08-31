import { BarChart3, LayoutDashboard, School, Settings, Users } from 'lucide-react';
import { AppShell } from './AppShell';

export function AdminLayout() {
  return (
    <AppShell
      homeTo="/admin/dashboard"
      items={[
        { to: '/admin/dashboard', labelKey: 'nav.overview', icon: LayoutDashboard },
        { to: '/admin/users', labelKey: 'nav.users', icon: Users },
        { to: '/admin/academics', labelKey: 'nav.academics', icon: School },
        { to: '/admin/reports', labelKey: 'nav.reports', icon: BarChart3 },
      ]}
      moreItems={[{ to: '/admin/settings', labelKey: 'nav.settings', icon: Settings }]}
    />
  );
}
