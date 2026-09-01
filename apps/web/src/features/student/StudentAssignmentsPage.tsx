import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { UpcomingAssignment } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from './QueryState';
import { dueUrgency, formatDue, StatusChip, type DueUrgency } from './StatusChip';
import { StudentEmptyState, StudentList, StudentPageHeader } from './StudentChrome';
import { ClipboardCheckIcon } from '@/components/icons/clipboard-check';
import { cn } from '@/lib/cn';

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
              <StudentList>
                {group.items.map((item) => {
                  const urgency = dueUrgency(item.dueAt, item.status);
                  return (
                    <li key={item.id} className="border-b border-border last:border-b-0">
                      <Link
                        to={`/student/assignments/${item.id}`}
                        className="flex w-full items-start gap-3 px-3 py-2.5 text-start text-inherit no-underline hover:bg-overlay focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{item.title}</p>
                          <p
                            className={cn(
                              'mt-0.5 truncate text-xs text-muted',
                              urgency === 'overdue' && 'text-danger',
                            )}
                          >
                            {item.subjectName} · {t('student.due', { date: formatDue(item.dueAt, i18n.language) })}
                          </p>
                        </div>
                        <StatusChip status={item.status} />
                      </Link>
                    </li>
                  );
                })}
              </StudentList>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
