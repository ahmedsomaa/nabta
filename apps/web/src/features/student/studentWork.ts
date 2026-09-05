export const ACTIONABLE_ASSIGNMENT = new Set(['NOT_STARTED', 'DRAFT', 'LATE', 'RETURNED']);
export const ACTIONABLE_QUIZ = new Set(['NOT_STARTED', 'IN_PROGRESS']);
export const COMPLETED_QUIZ = new Set(['SUBMITTED', 'EXPIRED']);

export function isSameCalendarDay(iso: string | null, now = new Date()) {
  if (!iso) return false;
  const due = new Date(iso);
  if (Number.isNaN(due.getTime())) return false;
  return (
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate()
  );
}
