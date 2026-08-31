import { BookOpen, ClipboardList, GraduationCap, House, MoreHorizontal } from 'lucide-react';
import { AppShell } from './AppShell';

export function StudentLayout() {
  return (
    <AppShell
      homeTo="/student/dashboard"
      items={[
        { to: '/student/dashboard', labelKey: 'nav.home', icon: House },
        { to: '/student/classes', labelKey: 'nav.myClasses', icon: BookOpen },
        { to: '/student/assignments', labelKey: 'nav.assignments', icon: ClipboardList },
        { to: '/student/grades', labelKey: 'nav.grades', icon: GraduationCap },
      ]}
      moreItems={[{ to: '/student/more', labelKey: 'nav.more', icon: MoreHorizontal }]}
    />
  );
}
