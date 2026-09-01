import { Chip } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import type { StudentAssignmentStatus, StudentAssessmentStatus } from '@nabta/types';

const keyByStatus: Record<StudentAssignmentStatus, string> = {
  NOT_STARTED: 'student.statusNotStarted',
  DRAFT: 'student.statusDraft',
  SUBMITTED: 'student.statusSubmitted',
  LATE: 'student.statusLate',
  GRADED: 'student.statusGraded',
  RETURNED: 'student.statusReturned',
};

export function StatusChip({ status }: { status: StudentAssignmentStatus | string }) {
  const { t } = useTranslation();
  const typed = status as StudentAssignmentStatus;
  const color =
    typed === 'SUBMITTED' || typed === 'GRADED'
      ? 'success'
      : typed === 'RETURNED' || typed === 'DRAFT'
        ? 'warning'
        : typed === 'LATE'
          ? 'danger'
          : 'default';
  return (
    <Chip size="sm" color={color} variant="soft">
      {t(keyByStatus[typed] ?? 'student.statusNotStarted')}
    </Chip>
  );
}

const quizKeyByStatus: Record<StudentAssessmentStatus, string> = {
  NOT_STARTED: 'assessment.statusNotStarted',
  IN_PROGRESS: 'assessment.statusInProgress',
  SUBMITTED: 'assessment.statusSubmitted',
  EXPIRED: 'assessment.statusExpired',
};

export function QuizStatusChip({ status }: { status: StudentAssessmentStatus }) {
  const { t } = useTranslation();
  const color =
    status === 'SUBMITTED'
      ? 'success'
      : status === 'EXPIRED'
        ? 'danger'
        : status === 'IN_PROGRESS'
          ? 'warning'
          : 'default';
  return (
    <Chip size="sm" color={color} variant="soft">
      {t(quizKeyByStatus[status] ?? 'assessment.statusNotStarted')}
    </Chip>
  );
}

export function formatDue(iso: string | null, locale: string) {
  if (!iso) return '';
  return new Intl.DateTimeFormat(locale.startsWith('ar') ? 'ar' : 'en', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

const DONE_STATUSES = new Set(['SUBMITTED', 'GRADED', 'EXPIRED']);

export type DueUrgency = 'overdue' | 'soon' | 'none';

export function dueUrgency(dueAt: string | null, status: string): DueUrgency {
  if (!dueAt || DONE_STATUSES.has(status)) return 'none';
  const due = new Date(dueAt).getTime();
  const now = Date.now();
  if (Number.isNaN(due)) return 'none';
  if (due < now) return 'overdue';
  if (due - now <= 48 * 60 * 60 * 1000) return 'soon';
  return 'none';
}

export function urgencyClass(urgency: DueUrgency) {
  if (urgency === 'overdue') return 'border-s-4 border-s-danger';
  if (urgency === 'soon') return 'border-s-4 border-s-warning';
  return '';
}

export function letterChipColor(letter: string | null): 'success' | 'warning' | 'danger' | 'default' {
  if (!letter) return 'default';
  const first = letter.trim().charAt(0).toUpperCase();
  if (first === 'A' || first === 'B') return 'success';
  if (first === 'C') return 'warning';
  if (first === 'D' || first === 'F') return 'danger';
  return 'default';
}
