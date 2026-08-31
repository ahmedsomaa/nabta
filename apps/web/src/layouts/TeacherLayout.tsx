import { BookOpen, ClipboardList, GraduationCap, LayoutDashboard, MoreHorizontal } from 'lucide-react';
import { AppShell } from './AppShell';

export function TeacherLayout() {
  return (
    <AppShell
      homeTo="/teacher/dashboard"
      items={[
        { to: '/teacher/dashboard', labelKey: 'nav.home', icon: LayoutDashboard },
        { to: '/teacher/classes', labelKey: 'nav.classes', icon: BookOpen },
        { to: '/teacher/assignments', labelKey: 'nav.assignments', icon: ClipboardList },
        { to: '/teacher/gradebook', labelKey: 'nav.gradebook', icon: GraduationCap },
      ]}
      moreItems={[{ to: '/teacher/more', labelKey: 'nav.more', icon: MoreHorizontal }]}
    />
  );
}
