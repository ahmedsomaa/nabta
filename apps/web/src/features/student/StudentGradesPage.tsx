import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, Chip } from '@heroui/react';
import type {
  StudentAssessmentListItem,
  StudentGradeDetail,
  StudentGradeListItem,
  UpcomingAssignment,
} from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { EmptyCard, QueryError, QueryLoading } from './QueryState';
import { letterChipColor } from './StatusChip';
import { StudentEmptyState, StudentPageHeader, StudentProgress } from './StudentChrome';
import { GraduationCapIcon } from '@/components/icons/graduation-cap';
import { formatShortMonthDay } from './studentDates';
import { usePageTrail } from '@/layouts/PageTrail';

const RECENT_LIMIT = 8;

export function StudentGradesPage() {
  const { subjectId } = useParams();
  if (subjectId) return <GradeDetail subjectId={subjectId} />;
  return <GradeList />;
}

function GradeList() {
  const { t, i18n } = useTranslation();
  const list = useQuery({
    queryKey: ['student-grades'],
    queryFn: () => apiFetch<StudentGradeListItem[]>('/me/grades'),
  });
  const assignments = useQuery({
    queryKey: ['student-assignments'],
    queryFn: () => apiFetch<UpcomingAssignment[]>('/me/assignments'),
  });
  const assessments = useQuery({
    queryKey: ['student-assessments'],
    queryFn: () => apiFetch<StudentAssessmentListItem[]>('/me/assessments'),
  });

  if (list.isLoading) return <QueryLoading variant="table" />;
  if (list.isError || !list.data) return <QueryError onRetry={() => void list.refetch()} />;

  const scored = list.data.filter((row) => row.percentage != null);
  const average =
    scored.length > 0
      ? Math.round(scored.reduce((sum, row) => sum + (row.percentage ?? 0), 0) / scored.length)
      : null;

  const recent = [
    ...(assignments.data ?? [])
      .filter((item) => item.status === 'GRADED' && item.score != null && item.maxScore != null)
      .map((item) => ({
        key: `assignment-${item.id}`,
        href: `/student/assignments/${item.id}`,
        title: item.title,
        subjectName: item.subjectName,
        kind: t('nav.assignments'),
        score: item.score ?? 0,
        maxScore: item.maxScore ?? 0,
        at: item.gradesPublishedAt ?? item.publishedAt ?? null,
      })),
    ...(assessments.data ?? [])
      .filter((item) => item.bestScore != null && item.maxScore > 0)
      .map((item) => ({
        key: `assessment-${item.id}`,
        href: `/student/assessments/${item.id}`,
        title: item.title,
        subjectName: item.subjectName,
        kind: t('nav.quizzes'),
        score: item.bestScore ?? 0,
        maxScore: item.maxScore,
        at: item.submittedAt ?? item.publishedAt ?? null,
      })),
  ]
    .sort((a, b) => (b.at ?? '').localeCompare(a.at ?? ''))
    .slice(0, RECENT_LIMIT);

  return (
    <div className="space-y-8">
      <StudentPageHeader title={t('grades.title')} subtitle={t('grades.subtitle')} />
      {list.data.length === 0 ? (
        <StudentEmptyState icon={GraduationCapIcon}>{t('grades.empty')}</StudentEmptyState>
      ) : (
        <>
          {average != null ? (
            <Card className="bg-surface">
              <Card.Header>
                <Card.Description>{t('grades.overallAverage')}</Card.Description>
              </Card.Header>
              <Card.Content className="space-y-4">
                <p className="text-5xl font-semibold tracking-tight tabular-nums">{average}%</p>
                <StudentProgress value={average} label={t('grades.overallAverage')} />
              </Card.Content>
            </Card>
          ) : null}

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">{t('grades.yourSubjects')}</h2>
            <ul className="overflow-hidden rounded-xl border border-border bg-surface">
              {list.data.map((row) => (
                <li key={row.subjectId} className="border-b border-border last:border-b-0">
                  <Link
                    to={`/student/grades/${row.subjectId}`}
                    className="flex flex-col gap-2 px-4 py-3 text-inherit no-underline hover:bg-overlay md:flex-row md:items-center md:gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium [overflow-wrap:anywhere]">{row.subjectName}</p>
                      <p className="mt-0.5 truncate text-xs text-muted">{row.className}</p>
                    </div>
                    {row.percentage != null ? (
                      <div className="flex items-center gap-3 md:w-72">
                        <p className="w-12 shrink-0 text-lg font-semibold tabular-nums md:text-end">
                          {row.percentage}%
                        </p>
                        <div className="min-w-0 flex-1">
                          <StudentProgress value={row.percentage} label={t('grades.current')} />
                        </div>
                        {row.letter ? (
                          <Chip size="sm" color={letterChipColor(row.letter)} variant="soft">
                            {row.letter}
                          </Chip>
                        ) : null}
                      </div>
                    ) : (
                      <p className="text-sm text-muted">{t('grades.noScore')}</p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {recent.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">{t('grades.recent')}</h2>
              <ul className="overflow-hidden rounded-xl border border-border bg-surface">
                {recent.map((item) => {
                  const percent =
                    item.maxScore > 0 ? Math.round((item.score / item.maxScore) * 100) : null;
                  const dateLabel = formatShortMonthDay(item.at, i18n.language);
                  return (
                    <li key={item.key} className="border-b border-border last:border-b-0">
                      <Link
                        to={item.href}
                        className="flex items-start justify-between gap-3 px-4 py-3 text-inherit no-underline hover:bg-overlay"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{item.title}</p>
                          <p className="mt-0.5 truncate text-xs text-muted">
                            {[item.subjectName, item.kind, dateLabel].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        <div className="shrink-0 text-end">
                          <p className="text-sm font-medium tabular-nums" dir="ltr">
                            {item.score} / {item.maxScore}
                          </p>
                          {percent != null ? (
                            <p className="mt-0.5 text-xs tabular-nums text-muted">{percent}%</p>
                          ) : null}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}

function GradeDetail({ subjectId }: { subjectId: string }) {
  const { t } = useTranslation();
  const detail = useQuery({
    queryKey: ['student-grades', subjectId],
    queryFn: () => apiFetch<StudentGradeDetail>(`/me/grades/${subjectId}`),
  });
  usePageTrail(detail.data ? [{ label: detail.data.subjectName }] : []);

  if (detail.isLoading) return <QueryLoading />;
  if (detail.isError || !detail.data) return <QueryError onRetry={() => void detail.refetch()} />;

  const row = detail.data;
  const percent = row.percentage ?? 0;
  const gradedCount =
    row.assignments.filter((item) => item.score != null).length +
    row.assessments.filter((item) => item.score != null).length;

  return (
    <div className="space-y-6">
      <StudentPageHeader
        title={row.subjectName}
        subtitle={row.className}
        trailing={
          row.letter ? (
            <Chip size="sm" color={letterChipColor(row.letter)} variant="soft">
              {row.letter}
            </Chip>
          ) : null
        }
      />
      <div className="space-y-2">
        <p className="text-3xl font-semibold tracking-tight tabular-nums">
          {row.percentage == null ? t('grades.noScore') : `${row.percentage}%`}
        </p>
        {row.percentage != null ? (
          <StudentProgress value={percent} label={t('grades.current')} />
        ) : null}
        <p className="text-sm text-muted">{t('grades.gradedItems', { count: gradedCount })}</p>
      </div>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('grades.assignments')}</h2>
        {row.assignments.length === 0 ? (
          <EmptyCard>{t('student.emptyAssignments')}</EmptyCard>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {row.assignments.map((item) => (
              <GradeRow
                key={item.id}
                href={`/student/assignments/${item.id}`}
                title={item.title}
                score={item.score}
                maxScore={item.maxScore}
                feedback={item.feedback}
                emptyLabel={t('grades.noScore')}
              />
            ))}
          </div>
        )}
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('grades.quizzes')}</h2>
        {row.assessments.length === 0 ? (
          <EmptyCard>{t('assessment.empty')}</EmptyCard>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {row.assessments.map((item) => (
              <GradeRow
                key={item.id}
                href={`/student/assessments/${item.id}`}
                title={item.title}
                score={item.score}
                maxScore={item.maxScore}
                emptyLabel={t('grades.noScore')}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function GradeRow({
  href,
  title,
  score,
  maxScore,
  feedback,
  emptyLabel,
}: {
  href: string;
  title: string;
  score: number | null;
  maxScore: number;
  feedback?: string | null;
  emptyLabel: string;
}) {
  return (
    <Link
      to={href}
      className="flex items-start justify-between gap-3 px-4 py-3 no-underline hover:bg-overlay"
    >
      <div className="min-w-0">
        <p className="font-medium text-foreground">{title}</p>
        {feedback ? <p className="mt-0.5 line-clamp-2 text-sm text-muted">{feedback}</p> : null}
      </div>
      <p className="shrink-0 text-sm tabular-nums text-muted" dir="ltr">
        {score == null ? emptyLabel : `${score} / ${maxScore}`}
      </p>
    </Link>
  );
}
