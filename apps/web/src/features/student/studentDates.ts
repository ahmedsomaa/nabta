import { formatDue } from "./StatusChip";

export function formatRelativeDue(
  iso: string | null,
  locale: string,
  t: (key: string) => string,
) {
  if (!iso) return "";
  const due = new Date(iso);
  if (Number.isNaN(due.getTime())) return "";
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDue = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const days = Math.round((startOfDue.getTime() - startOfToday.getTime()) / 86_400_000);
  if (days < 0) return t("student.overdue");
  if (days === 0) return t("student.dueTodayLabel");
  if (days === 1) return t("student.dueTomorrow");
  if (days < 7) return t(`student.weekdayLong.${due.getDay()}`);
  return formatDue(iso, locale);
}

export function formatShortMonthDay(iso: string | null, locale: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale.startsWith("ar") ? "ar" : "en", {
    day: "numeric",
    month: "short",
  }).format(date);
}
