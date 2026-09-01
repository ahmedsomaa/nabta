import { BookOpen, ClipboardList, FileQuestion, GraduationCap, House } from 'lucide-react';
import { AppShell } from './AppShell';

export function StudentLayout() {
  return (
    <AppShell
      homeTo="/student/dashboard"
      items={[
        { to: '/student/dashboard', labelKey: 'nav.home', icon: House },
        { to: '/student/classes', labelKey: 'nav.myClasses', icon: BookOpen },
        { to: '/student/assignments', labelKey: 'nav.assignments', icon: ClipboardList },
        { to: '/student/quizzes', labelKey: 'nav.quizzes', icon: FileQuestion },
        { to: '/student/grades', labelKey: 'nav.grades', icon: GraduationCap },
      ]}
    />
  );
}
