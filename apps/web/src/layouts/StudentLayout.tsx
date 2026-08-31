import { AppShell } from './AppShell';

export function StudentLayout() {
  return (
    <AppShell
      homeTo="/student/dashboard"
      items={[
        { to: '/student/dashboard', labelKey: 'nav.home' },
        { to: '/student/classes', labelKey: 'nav.myClasses' },
        { to: '/student/assignments', labelKey: 'nav.assignments' },
        { to: '/student/grades', labelKey: 'nav.grades' },
      ]}
      moreItems={[{ to: '/student/more', labelKey: 'nav.more' }]}
    />
  );
}
