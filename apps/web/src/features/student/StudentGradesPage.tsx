import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Chip } from '@heroui/react';
import type { StudentGradeDetail, StudentGradeListItem } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { EmptyCard, QueryError, QueryLoading } from './QueryState';
import { letterChipColor } from './StatusChip';
import { StudentEmptyState, StudentPageHeader, StudentProgress } from './StudentChrome';
import { GraduationCapIcon } from '@/components/icons/graduation-cap';
import { usePageTrail } from '@/layouts/PageTrail';

export function StudentGradesPage() {
  const { subjectId } = useParams();
  if (subjectId) return <GradeDetail subjectId={subjectId} />;
  return <GradeList />;
}

function GradeList() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const list = useQuery({
    queryKey: ['student-grades'],
    queryFn: () => apiFetch<StudentGradeListItem[]>('/me/grades'),
  });

  if (list.isLoading) return <QueryLoading variant="table" />;
  if (list.isError || !list.data) return <QueryError onRetry={() => void list.refetch()} />;

  const scored = list.data.filter((row) => row.percentage != null);
  const average =
    scored.length > 0
      ? Math.round(scored.reduce((sum, row) => sum + (row.percentage ?? 0), 0) / scored.length)
      : null;
  const statusParts = [
    t('grades.subjectsCount', { count: list.data.length }),
    average == null ? t('grades.noScore') : t('student.homeAverage', { percent: average }),
  ];

  return (
    <div className="space-y-4">
      <StudentPageHeader title={t('grades.title')} />
      {list.data.length === 0 ? (
        <StudentEmptyState icon={GraduationCapIcon}>{t('grades.empty')}</StudentEmptyState>
      ) : (
        <>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            {statusParts.map((part, index) => (
              <span key={part} className="contents">
                {index > 0 ? (
                  <span className="text-border" aria-hidden>
                    ·
                  </span>
                ) : null}
                {part}
              </span>
            ))}
          </p>
          <div className="min-w-0 overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[28rem] text-sm">
              <thead className="bg-surface text-muted">
                <tr>
                  <th className="px-4 py-2 text-start font-medium">{t('nav.myClasses')}</th>
                  <th className="w-48 px-4 py-2 text-end font-medium">{t('grades.current')}</th>
                  <th className="w-28 px-4 py-2 text-end font-medium">{t('grades.letter')}</th>
                </tr>
              </thead>
              <tbody>
                {list.data.map((row) => (
                  <tr
                    key={row.subjectId}
                    className="cursor-pointer border-t border-border hover:bg-overlay"
                    onClick={() => navigate(`/student/grades/${row.subjectId}`)}
                  >
                    <td className="px-4 py-3 text-start">
                      <Link
                        to={`/student/grades/${row.subjectId}`}
                        className="font-medium text-foreground no-underline hover:text-accent"
                      >
                        {row.subjectName}
                      </Link>
                      <span className="text-muted"> · {row.className}</span>
                    </td>
                    <td className="px-4 py-3 text-end">
                      <div className="flex items-center justify-end gap-3">
                        {row.percentage != null ? (
                          <div className="hidden w-16 md:block">
                            <StudentProgress
                              value={row.percentage}
                              label={t('grades.current')}
                            />
                          </div>
                        ) : null}
                        <span className="tabular-nums">
                          {row.percentage == null ? t('grades.noScore') : `${row.percentage}%`}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <Chip size="sm" color={letterChipColor(row.letter)} variant="soft">
                          {row.letter ?? t('grades.noScore')}
                        </Chip>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
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
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
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
