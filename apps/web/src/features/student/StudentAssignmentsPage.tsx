import { useState } from 'react';
import type { Key } from '@heroui/react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Check, ClipboardCheck, Sprout } from 'lucide-react';
import { Label, ListBox, Select } from '@heroui/react';
import type { UpcomingAssignment } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from './QueryState';
import { dueUrgency, formatDue } from './StatusChip';
import { StudentEmptyState, StudentPageHeader } from './StudentChrome';
import { StudentTabs } from './StudentTabs';
import { ClipboardCheckIcon } from '@/components/icons/clipboard-check';
import { cn } from '@/lib/cn';
import { ACTIONABLE_ASSIGNMENT } from './studentWork';
import { formatRelativeDue, formatShortMonthDay } from './studentDates';

type SortKey = 'dueAsc' | 'dueDesc' | 'recent' | 'graded';

function sortAssignments(items: UpcomingAssignment[], sort: SortKey) {
  return [...items].sort((a, b) => {
    if (sort === 'dueDesc') return (b.dueAt ?? '').localeCompare(a.dueAt ?? '');
    if (sort === 'recent') return (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '');
    if (sort === 'graded') {
      const aGraded = a.gradesPublishedAt ?? '';
      const bGraded = b.gradesPublishedAt ?? '';
      if (!aGraded && bGraded) return 1;
      if (aGraded && !bGraded) return -1;
      return bGraded.localeCompare(aGraded);
    }
    return (a.dueAt ?? '9999').localeCompare(b.dueAt ?? '9999');
  });
}

function AssignmentRows({ items }: { items: UpcomingAssignment[] }) {
  const { t, i18n } = useTranslation();
  if (items.length === 0) {
    return (
      <StudentEmptyState icon={Sprout}>
        <p className="font-medium text-foreground">{t('student.caughtUp')}</p>
        <p className="mt-1">{t('student.emptyCategory')}</p>
      </StudentEmptyState>
    );
  }
  return (
    <ul className="overflow-hidden rounded-xl border border-border bg-surface">
      {items.map((item) => {
        const urgency = dueUrgency(item.dueAt, item.status);
        const done = item.status === 'SUBMITTED' || item.status === 'GRADED';
        const meta = [
          item.subjectName,
          item.maxScore != null ? t('student.assignmentPoints', { count: item.maxScore }) : null,
          item.attachmentCount
            ? t('student.attachmentsCount', { count: item.attachmentCount })
            : null,
        ].filter(Boolean);
        const statusLabel =
          item.status === 'GRADED' && item.score != null && item.maxScore != null
            ? t('student.gradedScore', { score: item.score, max: item.maxScore })
            : item.status === 'GRADED'
              ? t('student.statusGraded')
              : item.status === 'SUBMITTED'
                ? t('student.statusSubmitted')
                : urgency === 'overdue'
                  ? t('student.overdueOn', {
                      date: formatShortMonthDay(item.dueAt, i18n.language),
                    })
                  : formatRelativeDue(item.dueAt, i18n.language, t) || t('student.statusNotStarted');
        return (
          <li key={item.id} className="border-b border-border last:border-b-0">
            <Link
              to={`/student/assignments/${item.id}`}
              className="group flex flex-col gap-2 px-4 py-3 text-inherit no-underline transition-colors duration-150 hover:bg-overlay focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent md:flex-row md:items-start md:gap-3"
            >
              {done ? (
                <Check className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={2.5} aria-hidden />
              ) : (
                <ClipboardCheck className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
              )}
              <span className="min-w-0 flex-1">
                <span className="block font-medium [overflow-wrap:anywhere]">{item.title}</span>
                {meta.length > 0 ? (
                  <span className="mt-0.5 block text-sm text-muted">{meta.join(' · ')}</span>
                ) : null}
              </span>
              <span className="flex items-end justify-between gap-3 md:shrink-0 md:flex-col md:items-end">
                <span
                  title={item.dueAt ? formatDue(item.dueAt, i18n.language) : undefined}
                  className={cn(
                    'text-sm',
                    urgency === 'overdue' ? 'text-danger' : 'text-muted',
                    urgency === 'soon' && 'font-medium text-foreground',
                  )}
                >
                  {statusLabel}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 text-sm text-accent">
                  {done ? t('student.viewWork') : t('student.openWork')}
                  <ArrowRight
                    className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                    aria-hidden
                  />
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function StudentAssignmentsPage() {
  const { t } = useTranslation();
  const [sort, setSort] = useState<SortKey>('dueAsc');
  const query = useQuery({
    queryKey: ['student-assignments'],
    queryFn: () => apiFetch<UpcomingAssignment[]>('/me/assignments'),
  });

  if (query.isLoading) return <QueryLoading variant="grid" />;
  if (query.isError || !query.data) return <QueryError onRetry={() => void query.refetch()} />;

  const todo = query.data.filter((item) => ACTIONABLE_ASSIGNMENT.has(item.status));
  const submitted = query.data.filter((item) => item.status === 'SUBMITTED');
  const graded = query.data.filter((item) => item.status === 'GRADED');
  const sortOptions: { id: SortKey; label: string }[] = [
    { id: 'dueAsc', label: t('student.sortDueAsc') },
    { id: 'dueDesc', label: t('student.sortDueDesc') },
    { id: 'recent', label: t('student.sortRecent') },
    { id: 'graded', label: t('student.sortGraded') },
  ];

  return (
    <div className="space-y-6">
      <StudentPageHeader title={t('nav.assignments')} subtitle={t('student.assignmentsSubtitle')} />
      {query.data.length === 0 ? (
        <StudentEmptyState icon={ClipboardCheckIcon}>{t('student.emptyAssignments')}</StudentEmptyState>
      ) : (
        <StudentTabs
          label={t('nav.assignments')}
          end={
            <Select
              className="w-full md:w-56"
              variant="secondary"
              value={sort}
              onChange={(value: Key | Key[] | null) => {
                if (typeof value === 'string') setSort(value as SortKey);
              }}
            >
              <Label>{t('student.sortBy')}</Label>
              <Select.Trigger>
                <Select.Value />
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox>
                  {sortOptions.map((option) => (
                    <ListBox.Item key={option.id} id={option.id} textValue={option.label}>
                      {option.label}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          }
          items={[
            {
              id: 'all',
              title: t('student.filterAll'),
              count: query.data.length,
              content: <AssignmentRows items={sortAssignments(query.data, sort)} />,
            },
            {
              id: 'todo',
              title: t('student.tabToDo'),
              count: todo.length,
              content: <AssignmentRows items={sortAssignments(todo, sort)} />,
            },
            {
              id: 'submitted',
              title: t('student.tabSubmitted'),
              count: submitted.length,
              content: <AssignmentRows items={sortAssignments(submitted, sort)} />,
            },
            {
              id: 'graded',
              title: t('student.tabGraded'),
              count: graded.length,
              content: <AssignmentRows items={sortAssignments(graded, sort)} />,
            },
          ]}
        />
      )}
    </div>
  );
}
