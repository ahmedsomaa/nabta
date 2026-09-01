import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { UpcomingAssignment } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from './QueryState';
import { dueUrgency, formatDue, type DueUrgency } from './StatusChip';
import { StudentEmptyState, StudentPageHeader } from './StudentChrome';
import { WorkItemCard } from './WorkItemCard';
import { ClipboardCheckIcon } from '@/components/icons/clipboard-check';

const DONE = new Set(['SUBMITTED', 'GRADED']);
type GroupKey = DueUrgency | 'later' | 'done';

function groupAssignments(items: UpcomingAssignment[]) {
  const groups: { key: GroupKey; items: UpcomingAssignment[] }[] = [
    { key: 'overdue', items: [] },
    { key: 'soon', items: [] },
    { key: 'later', items: [] },
    { key: 'done', items: [] },
  ];
  for (const item of items) {
    if (DONE.has(item.status)) {
      groups[3]!.items.push(item);
      continue;
    }
    const urgency = dueUrgency(item.dueAt, item.status);
    if (urgency === 'overdue') groups[0]!.items.push(item);
    else if (urgency === 'soon') groups[1]!.items.push(item);
    else groups[2]!.items.push(item);
  }
  return groups.filter((group) => group.items.length > 0);
}

export function StudentAssignmentsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ['student-assignments'],
    queryFn: () => apiFetch<UpcomingAssignment[]>('/me/assignments'),
  });

  if (query.isLoading) return <QueryLoading variant="grid" />;
  if (query.isError || !query.data) return <QueryError onRetry={() => void query.refetch()} />;

  const groups = groupAssignments(query.data);
  const heading = (key: GroupKey) =>
    key === 'overdue'
      ? t('student.overdue')
      : key === 'soon'
        ? t('student.dueToday')
        : key === 'done'
          ? t('student.groupDone')
          : t('student.later');
  const doneCount = query.data.filter((item) => DONE.has(item.status)).length;
  const overdueCount = query.data.filter(
    (item) => !DONE.has(item.status) && dueUrgency(item.dueAt, item.status) === 'overdue',
  ).length;
  const toDoCount = query.data.length - doneCount;
  const statusParts = [
    { key: 'todo', text: t('student.toDoCount', { count: toDoCount }), tone: 'muted' as const },
    overdueCount > 0
      ? { key: 'overdue', text: t('student.homeOverdue', { count: overdueCount }), tone: 'danger' as const }
      : null,
    doneCount > 0
      ? { key: 'done', text: t('student.doneCount', { count: doneCount }), tone: 'muted' as const }
      : null,
  ].filter((part): part is { key: string; text: string; tone: 'muted' | 'danger' } => Boolean(part));

  return (
    <div className="space-y-6">
      <StudentPageHeader title={t('nav.assignments')} />
      {query.data.length === 0 ? (
        <StudentEmptyState icon={ClipboardCheckIcon}>{t('student.emptyAssignments')}</StudentEmptyState>
      ) : (
        <>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            {statusParts.map((part, index) => (
              <span key={part.key} className="contents">
                {index > 0 ? (
                  <span className="text-border" aria-hidden>
                    ·
                  </span>
                ) : null}
                <span className={part.tone === 'danger' ? 'text-danger' : undefined}>{part.text}</span>
              </span>
            ))}
          </p>
          {groups.map((group) => (
            <section key={group.key} className="space-y-3">
              <h2 className="text-lg font-semibold">
                {heading(group.key)}{' '}
                <span className="font-normal text-muted">({group.items.length})</span>
              </h2>
              <div className="grid gap-3">
                {group.items.map((item) => (
                  <WorkItemCard
                    key={item.id}
                    kind="assignment"
                    showIcon={false}
                    title={item.title}
                    subtitle={`${item.subjectName} · ${t('student.due', { date: formatDue(item.dueAt, i18n.language) })}`}
                    status={item.status}
                    urgency={dueUrgency(item.dueAt, item.status)}
                    onPress={() => navigate(`/student/assignments/${item.id}`)}
                  />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
