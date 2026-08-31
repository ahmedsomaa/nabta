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
    typed === 'SUBMITTED' || typed === 'GRADED' || typed === 'RETURNED'
      ? 'success'
      : typed === 'LATE'
        ? 'danger'
        : typed === 'DRAFT'
          ? 'warning'
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
