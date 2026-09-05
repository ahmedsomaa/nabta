export function formatRelativeActivity(
  iso: string,
  locale: string,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return t('teacher.justNow');
  if (minutes < 60) return t('teacher.minutesAgo', { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24 && date.getDate() === now.getDate()) {
    return t('teacher.hoursAgo', { count: hours });
  }
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const days = Math.round((startOfDate.getTime() - startOfToday.getTime()) / 86_400_000);
  if (days === 0) return t('student.activityToday');
  if (days === -1) return t('student.activityYesterday');
  return new Intl.DateTimeFormat(locale.startsWith('ar') ? 'ar' : 'en', {
    day: 'numeric',
    month: 'short',
  }).format(date);
}

export function formatWeekdayDate(now: Date, locale: string) {
  return new Intl.DateTimeFormat(locale.startsWith('ar') ? 'ar' : 'en', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(now);
}
