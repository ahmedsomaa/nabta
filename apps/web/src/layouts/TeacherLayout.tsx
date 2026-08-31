import { AppShell } from './AppShell';

export function TeacherLayout() {
  return (
    <AppShell
      homeTo="/teacher/dashboard"
      items={[
        { to: '/teacher/dashboard', labelKey: 'nav.home' },
        { to: '/teacher/classes', labelKey: 'nav.classes' },
        { to: '/teacher/assignments', labelKey: 'nav.assignments' },
        { to: '/teacher/gradebook', labelKey: 'nav.gradebook' },
      ]}
      moreItems={[{ to: '/teacher/more', labelKey: 'nav.more' }]}
    />
  );
}
