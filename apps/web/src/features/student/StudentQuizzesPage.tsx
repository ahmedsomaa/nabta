import { useState } from 'react';
import type { Key } from '@heroui/react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  Check,
  Clock3,
  FileQuestion,
  ListChecks,
  RotateCcw,
  Sprout,
} from 'lucide-react';
import { Card, Label, ListBox, Select } from '@heroui/react';
import type { StudentAssessmentListItem } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from './QueryState';
import { StudentEmptyState, StudentPageHeader, StudentProgress } from './StudentChrome';
import { StudentTabs } from './StudentTabs';
import { ACTIONABLE_QUIZ, COMPLETED_QUIZ } from './studentWork';
import { formatShortMonthDay } from './studentDates';
import { cn } from '@/lib/cn';

type SortKey = 'recent' | 'completed' | 'score';

function sortQuizzes(items: StudentAssessmentListItem[], sort: SortKey) {
  return [...items].sort((a, b) => {
    const aProgress = a.status === 'IN_PROGRESS' ? 0 : 1;
    const bProgress = b.status === 'IN_PROGRESS' ? 0 : 1;
    if (aProgress !== bProgress) return aProgress - bProgress;
    if (sort === 'completed') return (b.submittedAt ?? '').localeCompare(a.submittedAt ?? '');
    if (sort === 'score') return (b.bestScore ?? -1) - (a.bestScore ?? -1);
    return (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '');
  });
}

function QuizCards({ items }: { items: StudentAssessmentListItem[] }) {
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
    <ul className="space-y-3">
      {items.map((item) => {
        const percent =
          item.bestScore != null && item.maxScore > 0
            ? Math.round((item.bestScore / item.maxScore) * 100)
            : null;
        const answered = item.answeredCount ?? 0;
        const progressLabel = t('student.answeredOf', {
          answered,
          total: item.questionCount,
        });
        const statusLabel =
          item.status === 'IN_PROGRESS'
            ? t('assessment.statusInProgress')
            : item.status === 'SUBMITTED'
              ? t('student.completed')
              : item.status === 'EXPIRED'
                ? t('assessment.statusExpired')
                : t('assessment.available');
        const action =
          item.status === 'IN_PROGRESS'
            ? t('student.continue')
            : item.status === 'SUBMITTED' || (item.status === 'EXPIRED' && item.bestScore != null)
              ? t('assessment.viewResults')
              : t('assessment.start');
        return (
          <li key={item.id}>
            <Link
              to={`/student/assessments/${item.id}`}
              className="block text-inherit no-underline"
            >
              <Card
                className={cn(
                  'bg-surface transition-colors duration-150 hover:border-accent/40',
                  item.status === 'EXPIRED' && 'text-muted',
                )}
              >
                <Card.Header className="flex-row items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Card.Title className="[overflow-wrap:anywhere]">{item.title}</Card.Title>
                    <Card.Description>{item.subjectName}</Card.Description>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 text-sm',
                      item.status === 'NOT_STARTED' && 'font-medium text-accent',
                      item.status === 'IN_PROGRESS' && 'font-medium text-foreground',
                      item.status === 'SUBMITTED' && 'text-accent',
                    )}
                  >
                    {item.status === 'SUBMITTED' ? (
                      <span className="inline-flex items-center gap-1">
                        <Check className="size-3.5" strokeWidth={2.5} aria-hidden />
                        {statusLabel}
                      </span>
                    ) : (
                      statusLabel
                    )}
                  </span>
                </Card.Header>
                <Card.Content className="space-y-3">
                  {item.status === 'IN_PROGRESS' ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted">{progressLabel}</p>
                      <StudentProgress
                        value={
                          item.questionCount > 0 ? (answered / item.questionCount) * 100 : 0
                        }
                        label={progressLabel}
                      />
                    </div>
                  ) : null}
                  {item.status === 'SUBMITTED' && item.bestScore != null && item.maxScore > 0 ? (
                    <div className="flex items-end justify-between gap-3">
                      <p className="text-lg font-semibold tabular-nums">
                        {item.bestScore} / {item.maxScore}
                      </p>
                      {percent != null ? (
                        <p className="text-sm tabular-nums text-muted">{percent}%</p>
                      ) : null}
                    </div>
                  ) : null}
                  <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <ListChecks className="size-3.5" aria-hidden />
                      {t('assessment.questions', { count: item.questionCount })}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 className="size-3.5" aria-hidden />
                      {item.timeLimitMinutes
                        ? t('assessment.timeLimit', { minutes: item.timeLimitMinutes })
                        : t('assessment.noTimeLimit')}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <RotateCcw className="size-3.5" aria-hidden />
                      {t('assessment.attempts', {
                        used: item.attemptsUsed,
                        max: item.maxAttempts,
                      })}
                    </span>
                  </p>
                </Card.Content>
                <Card.Footer className="items-end justify-between gap-3">
                  <span className="text-sm text-muted">
                    {item.status === 'SUBMITTED' && item.submittedAt
                      ? t('student.quizCompletedOn', {
                          date: formatShortMonthDay(item.submittedAt, i18n.language),
                        })
                      : null}
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-sm text-accent">
                    {action}
                    <ArrowRight className="size-3.5 rtl:rotate-180" aria-hidden />
                  </span>
                </Card.Footer>
              </Card>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function StudentQuizzesPage() {
  const { t } = useTranslation();
  const [sort, setSort] = useState<SortKey>('recent');
  const query = useQuery({
    queryKey: ['student-assessments'],
    queryFn: () => apiFetch<StudentAssessmentListItem[]>('/me/assessments'),
  });

  if (query.isLoading) return <QueryLoading variant="grid" />;
  if (query.isError || !query.data) return <QueryError onRetry={() => void query.refetch()} />;

  const todo = query.data.filter((item) => ACTIONABLE_QUIZ.has(item.status));
  const completed = query.data.filter((item) => COMPLETED_QUIZ.has(item.status));
  const results = completed.filter((item) => item.bestScore != null);
  const sortOptions: { id: SortKey; label: string }[] = [
    { id: 'recent', label: t('student.sortRecent') },
    { id: 'completed', label: t('student.sortCompleted') },
    { id: 'score', label: t('student.sortScore') },
  ];

  return (
    <div className="space-y-6">
      <StudentPageHeader title={t('nav.quizzes')} subtitle={t('student.quizzesSubtitle')} />
      {query.data.length === 0 ? (
        <StudentEmptyState icon={FileQuestion}>{t('assessment.empty')}</StudentEmptyState>
      ) : (
        <StudentTabs
          label={t('nav.quizzes')}
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
              content: <QuizCards items={sortQuizzes(query.data, sort)} />,
            },
            {
              id: 'todo',
              title: t('student.tabToDo'),
              count: todo.length,
              content: <QuizCards items={sortQuizzes(todo, sort)} />,
            },
            {
              id: 'completed',
              title: t('student.tabCompleted'),
              count: completed.length,
              content: <QuizCards items={sortQuizzes(completed, sort)} />,
            },
            {
              id: 'results',
              title: t('student.tabResults'),
              count: results.length,
              content: <QuizCards items={sortQuizzes(results, sort)} />,
            },
          ]}
        />
      )}
    </div>
  );
}
