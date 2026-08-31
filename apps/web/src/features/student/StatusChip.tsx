import { Chip } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import type { StudentAssignmentStatus } from '@nabta/types';

const keyByStatus: Record<StudentAssignmentStatus, string> = {
  NOT_STARTED: 'student.statusNotStarted',
  DRAFT: 'student.statusDraft',
  SUBMITTED: 'student.statusSubmitted',
  LATE: 'student.statusLate',
  GRADED: 'student.statusGraded',
  RETURNED: 'student.statusReturned',
};

export function StatusChip({ status }: { status: StudentAssignmentStatus }) {
  const { t } = useTranslation();
  const color =
    status === 'SUBMITTED' || status === 'GRADED' || status === 'RETURNED'
      ? 'success'
      : status === 'LATE'
        ? 'danger'
        : status === 'DRAFT'
          ? 'warning'
          : 'default';
  return (
    <Chip size="sm" color={color} variant="soft">
      {t(keyByStatus[status])}
    </Chip>
  );
}

export function formatDue(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale.startsWith('ar') ? 'ar' : 'en', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}
