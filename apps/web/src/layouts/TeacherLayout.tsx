import { BookOpen, ClipboardList, FileQuestion, GraduationCap, LayoutDashboard } from 'lucide-react';
import { AppShell } from './AppShell';

export function TeacherLayout() {
  return (
    <AppShell
      homeTo="/teacher/dashboard"
      items={[
        { to: '/teacher/dashboard', labelKey: 'nav.home', icon: LayoutDashboard },
        { to: '/teacher/classes', labelKey: 'nav.classes', icon: BookOpen },
        { to: '/teacher/assignments', labelKey: 'nav.assignments', icon: ClipboardList },
        { to: '/teacher/assessments', labelKey: 'nav.quizzes', icon: FileQuestion },
        { to: '/teacher/gradebook', labelKey: 'nav.gradebook', icon: GraduationCap },
      ]}
    />
  );
}
