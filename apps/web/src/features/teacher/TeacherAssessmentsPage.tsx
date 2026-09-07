import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button, Chip, Dropdown, Input, Label, TextField } from '@heroui/react';
import { FileQuestion, LayoutGrid, List } from 'lucide-react';
import type { TeacherAssessmentListItem, TeacherQuizStatus } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from './QueryState';
import {
  PortalEmptyState,
  PortalList,
  PortalMetric,
  PortalPageHeader,
} from '@/components/portal/PortalChrome';
import { PortalFilterChips } from '@/components/portal/PortalTabs';
import { formatDue } from '@/features/student/StatusChip';
import { listHref, quizStatus, quizStatusChipColor } from './quizShared';

type StatusFilter = 'all' | TeacherQuizStatus;

export function TeacherAssessmentsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [classFilter, setClassFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [view, setView] = useState<'list' | 'grid'>('list');
  const query = useQuery({
    queryKey: ['teacher-assessments'],
    queryFn: () => apiFetch<TeacherAssessmentListItem[]>('/teacher/assessments'),
  });

  const items = query.data ?? [];
  const withStatus = items.map((item) => ({ ...item, status: quizStatus(item) }));
  const drafts = withStatus.filter((item) => item.status === 'draft');
  const published = withStatus.filter((item) => item.status !== 'draft');
  const closed = withStatus.filter((item) => item.status === 'closed');
  const active = withStatus.filter((item) => item.status === 'active');

  const classes = useMemo(
    () => [...new Set(items.map((item) => item.className))].sort(),
    [items],
  );
  const subjects = useMemo(
    () => [...new Set(items.map((item) => item.subjectName))].sort(),
    [items],
  );

  const filtered = withStatus.filter((item) => {
    const haystack = `${item.title} ${item.className} ${item.subjectName}`.toLowerCase();
    if (search.trim() && !haystack.includes(search.trim().toLowerCase())) return false;
    if (status !== 'all' && item.status !== status) return false;
    if (classFilter !== 'all' && item.className !== classFilter) return false;
    if (subjectFilter !== 'all' && item.subjectName !== subjectFilter) return false;
    if (dateFilter) {
      const due = (item.dueAt ?? item.opensAt ?? '').slice(0, 10);
      if (due !== dateFilter) return false;
    }
    return true;
  });

  if (query.isLoading) return <QueryLoading variant="grid" />;
  if (query.isError || !query.data) return <QueryError onRetry={() => void query.refetch()} />;

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title={t('nav.quizzes')}
        subtitle={t('teacher.quizzesSubtitle')}
        trailing={
          <Button variant="primary" onPress={() => navigate('/teacher/assessments/new')}>
            {t('teacher.createQuiz')}
          </Button>
        }
      />
      {items.length === 0 ? (
        <PortalEmptyState
          icon={FileQuestion}
          action={{
            label: t('teacher.createQuiz'),
            onPress: () => navigate('/teacher/assessments/new'),
          }}
        >
          {t('teacher.emptyQuizzes')}
        </PortalEmptyState>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <PortalMetric icon={FileQuestion} label={t('teacher.filterAll')} value={String(items.length)} />
            <PortalMetric icon={FileQuestion} label={t('teacher.draft')} value={String(drafts.length)} />
            <PortalMetric icon={FileQuestion} label={t('teacher.published')} value={String(published.length)} />
            <PortalMetric icon={FileQuestion} label={t('teacher.quizStatus.closed')} value={String(closed.length)} />
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <TextField name="quiz-search" value={search} onChange={setSearch} className="min-w-[12rem] flex-1">
              <Label>{t('teacher.searchQuizzes')}</Label>
              <Input />
            </TextField>
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-muted">{t('teacher.class')}</span>
              <select
                className="rounded-lg border border-border bg-background px-3 py-2"
                value={classFilter}
                onChange={(event) => setClassFilter(event.target.value)}
              >
                <option value="all">{t('teacher.filterAll')}</option>
                {classes.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-muted">{t('teacher.subject')}</span>
              <select
                className="rounded-lg border border-border bg-background px-3 py-2"
                value={subjectFilter}
                onChange={(event) => setSubjectFilter(event.target.value)}
              >
                <option value="all">{t('teacher.filterAll')}</option>
                {subjects.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium text-muted">{t('teacher.dueDate')}</span>
              <input
                type="date"
                className="rounded-lg border border-border bg-background px-3 py-2"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
              />
            </label>
            <div className="flex gap-1">
              <Button
                size="sm"
                isIconOnly
                variant={view === 'list' ? 'secondary' : 'ghost'}
                aria-label={t('teacher.listView')}
                onPress={() => setView('list')}
              >
                <List className="size-4" />
              </Button>
              <Button
                size="sm"
                isIconOnly
                variant={view === 'grid' ? 'secondary' : 'ghost'}
                aria-label={t('teacher.gridView')}
                onPress={() => setView('grid')}
              >
                <LayoutGrid className="size-4" />
              </Button>
            </div>
          </div>
          <PortalFilterChips
            value={status}
            onChange={setStatus}
            options={[
              { id: 'all', label: t('teacher.filterAll'), count: items.length },
              { id: 'draft', label: t('teacher.quizStatus.draft'), count: drafts.length },
              { id: 'scheduled', label: t('teacher.quizStatus.scheduled') },
              { id: 'active', label: t('teacher.quizStatus.active'), count: active.length },
              { id: 'closed', label: t('teacher.quizStatus.closed'), count: closed.length },
            ]}
          />
          {filtered.length === 0 ? (
            <PortalEmptyState icon={FileQuestion}>{t('teacher.emptyQuizzes')}</PortalEmptyState>
          ) : view === 'grid' ? (
            <div className="grid gap-3 md:grid-cols-2">
              {filtered.map((item) => (
                <QuizCard key={item.id} item={item} locale={i18n.language} />
              ))}
            </div>
          ) : (
            <PortalList>
              {filtered.map((item) => (
                <li key={item.id} className="border-b border-border last:border-b-0">
                  <QuizRow item={item} locale={i18n.language} />
                </li>
              ))}
            </PortalList>
          )}
        </>
      )}
    </div>
  );
}

function QuizRow({ item, locale }: { item: TeacherAssessmentListItem & { status: TeacherQuizStatus }; locale: string }) {
  const { t } = useTranslation();
  const href = listHref(item);
  return (
    <div className="flex items-start gap-3 px-3 py-2.5">
      <Link to={href} className="min-w-0 flex-1 text-start text-inherit no-underline">
        <p className="truncate font-medium">{item.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted">
          {item.className} · {item.subjectName} · {t('teacher.questionCount', { count: item.questionCount })} ·{' '}
          {t('teacher.pointsCount', { count: item.maxScore })}
          {item.dueAt ? ` · ${formatDue(item.dueAt, locale)}` : ''}
        </p>
      </Link>
      <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
        <Chip size="sm" variant="soft" color={quizStatusChipColor(item.status)}>
          {t(`teacher.quizStatus.${item.status}`)}
        </Chip>
        <span className="text-xs tabular-nums text-muted">
          {item.submittedCount}/{item.studentCount}
        </span>
        <QuizActions item={item} />
      </div>
    </div>
  );
}

function QuizCard({ item, locale }: { item: TeacherAssessmentListItem & { status: TeacherQuizStatus }; locale: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <Link to={listHref(item)} className="min-w-0 font-medium text-inherit no-underline hover:text-accent">
          {item.title}
        </Link>
        <Chip size="sm" variant="soft" color={quizStatusChipColor(item.status)}>
          {t(`teacher.quizStatus.${item.status}`)}
        </Chip>
      </div>
      <p className="text-xs text-muted">
        {item.className} · {item.subjectName}
      </p>
      <p className="text-xs text-muted">
        {t('teacher.questionCount', { count: item.questionCount })} · {t('teacher.pointsCount', { count: item.maxScore })}
        {item.dueAt ? ` · ${formatDue(item.dueAt, locale)}` : ''}
      </p>
      <p className="text-xs tabular-nums text-muted">
        {item.submittedCount}/{item.studentCount} {t('teacher.submissions')}
      </p>
      <QuizActions item={item} />
    </div>
  );
}

function QuizActions({ item }: { item: TeacherAssessmentListItem }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <Dropdown>
      <Dropdown.Trigger>
        <Button size="sm" variant="ghost" aria-label={t('teacher.actions')}>
          •••
        </Button>
      </Dropdown.Trigger>
      <Dropdown.Popover>
        <Dropdown.Menu
          onAction={(key) => {
            if (key === 'open') navigate(listHref(item));
            if (key === 'edit') navigate(`/teacher/assessments/${item.id}/edit`);
            if (key === 'results') navigate(`/teacher/assessments/${item.id}/submissions`);
          }}
        >
          <Dropdown.Item id="open" textValue={t('teacher.open')}>
            {t('teacher.open')}
          </Dropdown.Item>
          <Dropdown.Item id="edit" textValue={t('teacher.editQuiz')}>
            {t('teacher.editQuiz')}
          </Dropdown.Item>
          <Dropdown.Item id="results" textValue={t('teacher.results')}>
            {t('teacher.results')}
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
