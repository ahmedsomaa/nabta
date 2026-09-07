import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button, Chip } from '@heroui/react';
import type { TeacherAssignmentListItem } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { formatDue } from '@/features/student/StatusChip';
import { QueryError, QueryLoading } from './QueryState';
import { PortalEmptyState, PortalList, PortalPageHeader } from '@/components/portal/PortalChrome';
import { PortalFilterChips } from '@/components/portal/PortalTabs';
import { ClipboardCheckIcon } from '@/components/icons/clipboard-check';

type Filter = 'all' | 'toGrade' | 'draft' | 'published';

export function TeacherAssignmentsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const query = useQuery({
    queryKey: ['teacher-assignments'],
    queryFn: () => apiFetch<TeacherAssignmentListItem[]>('/teacher/assignments'),
  });

  if (query.isLoading) return <QueryLoading variant="grid" />;
  if (query.isError || !query.data) return <QueryError onRetry={() => void query.refetch()} />;

  const toGrade = query.data.filter((item) => item.pendingCount > 0);
  const draft = query.data.filter((item) => !item.publishedAt);
  const published = query.data.filter((item) => item.publishedAt);
  const items =
    filter === 'toGrade'
      ? toGrade
      : filter === 'draft'
        ? draft
        : filter === 'published'
          ? published
          : query.data;

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title={t('nav.assignments')}
        trailing={
          <Button variant="primary" onPress={() => navigate('/teacher/assignments/new')}>
            {t('teacher.newAssignment')}
          </Button>
        }
      />
      {query.data.length === 0 ? (
        <PortalEmptyState
          icon={ClipboardCheckIcon}
          action={{
            label: t('teacher.newAssignment'),
            onPress: () => navigate('/teacher/assignments/new'),
          }}
        >
          {t('teacher.emptyAssignments')}
        </PortalEmptyState>
      ) : (
        <>
          <PortalFilterChips
            value={filter}
            onChange={setFilter}
            options={[
              { id: 'all', label: t('teacher.filterAll'), count: query.data.length },
              { id: 'toGrade', label: t('teacher.filterToGrade'), count: toGrade.length },
              { id: 'draft', label: t('teacher.draft'), count: draft.length },
              { id: 'published', label: t('teacher.published'), count: published.length },
            ]}
          />
          {items.length === 0 ? (
            <PortalEmptyState icon={ClipboardCheckIcon}>{t('teacher.emptyAssignments')}</PortalEmptyState>
          ) : (
            <PortalList>
              {items.map((item) => (
                <li key={item.id} className="border-b border-border last:border-b-0">
                  <div className="flex items-start gap-3 px-3 py-2.5">
                    <Link
                      to={item.publishedAt ? `/teacher/assignments/${item.id}` : `/teacher/assignments/${item.id}/edit`}
                      className="min-w-0 flex-1 text-start text-inherit no-underline"
                    >
                      <p className="truncate font-medium">{item.title}</p>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {item.className} · {item.subjectName} ·{' '}
                        {item.dueAt
                          ? t('teacher.due', { date: formatDue(item.dueAt, i18n.language) })
                          : t('teacher.noDueDate')}
                      </p>
                    </Link>
                    <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
                      <Chip
                        size="sm"
                        variant="soft"
                        color={item.publishedAt ? 'success' : 'default'}
                      >
                        {item.publishedAt ? t('teacher.published') : t('teacher.draft')}
                      </Chip>
                      <Link
                        to={`/teacher/assignments/${item.id}/submissions`}
                        className="text-xs text-accent no-underline hover:opacity-80"
                      >
                        {t('teacher.submissions')}
                        {item.pendingCount > 0 ? ` (${item.pendingCount})` : ''}
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </PortalList>
          )}
        </>
      )}
    </div>
  );
}
