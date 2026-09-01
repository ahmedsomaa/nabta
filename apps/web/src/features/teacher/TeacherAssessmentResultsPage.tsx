import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button, Chip } from '@heroui/react';
import { CircleCheck, Percent, Users } from 'lucide-react';
import type { TeacherAssessmentResults, TeacherAttemptReview } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from './QueryState';
import { PortalEmptyState, PortalMetric, PortalPageHeader, PortalPanel } from '@/components/portal/PortalChrome';
import { usePageTrail } from '@/layouts/PageTrail';
import { useState } from 'react';
import { cn } from '@/lib/cn';

export function TeacherAssessmentResultsPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const [openId, setOpenId] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ['teacher-assessment-results', id],
    queryFn: () => apiFetch<TeacherAssessmentResults>(`/teacher/assessments/${id}/results`),
    enabled: Boolean(id),
  });
  const review = useQuery({
    queryKey: ['teacher-attempt', id, openId],
    queryFn: () => apiFetch<TeacherAttemptReview>(`/teacher/assessments/${id}/attempts/${openId}`),
    enabled: Boolean(id && openId),
  });

  usePageTrail(
    query.data
      ? [
          { label: query.data.title, to: `/teacher/assessments/${id}` },
          { label: t('teacher.results') },
        ]
      : [],
  );

  if (query.isLoading) return <QueryLoading variant="table" />;
  if (query.isError || !query.data) return <QueryError onRetry={() => void query.refetch()} />;

  const data = query.data;

  return (
    <div className="space-y-6">
      <PortalPageHeader title={`${data.title} · ${t('teacher.results')}`} />
      <div className="grid gap-3 sm:grid-cols-3">
        <PortalMetric
          icon={Users}
          label={t('teacher.attemptsLabel')}
          value={String(data.attemptCount)}
        />
        <PortalMetric
          icon={Percent}
          label={t('teacher.average')}
          value={data.average == null ? t('teacher.noGrade') : String(data.average)}
        />
        <PortalMetric
          icon={CircleCheck}
          tone="success"
          label={t('teacher.passRateLabel')}
          value={data.passRate == null ? t('teacher.noGrade') : `${data.passRate}%`}
        />
      </div>
      {data.students.length === 0 ? (
        <PortalEmptyState icon={Users}>{t('teacher.emptyRoster')}</PortalEmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[32rem] text-start text-sm [&_td]:text-start [&_th]:text-start">
            <thead className="bg-surface text-muted">
              <tr>
                <th className="px-4 py-2 text-start font-medium">{t('teacher.student')}</th>
                <th className="px-4 py-2 text-start font-medium">{t('teacher.score')}</th>
                <th className="px-4 py-2 text-start font-medium">{t('teacher.results')}</th>
              </tr>
            </thead>
            <tbody>
              {data.students.map((row) => (
                <tr key={row.studentId} className="border-t border-border">
                  <td className="px-4 py-3 [overflow-wrap:anywhere]">
                    {row.givenName} {row.familyName}
                  </td>
                  <td className="px-4 py-3">
                    {row.bestScore == null ? t('teacher.noGrade') : `${row.bestScore} / ${row.maxScore}`}
                    {row.passed === true ? (
                      <Chip size="sm" color="success" variant="soft" className="ms-2">
                        {t('teacher.passed')}
                      </Chip>
                    ) : null}
                    {row.passed === false ? (
                      <Chip size="sm" color="danger" variant="soft" className="ms-2">
                        {t('teacher.failed')}
                      </Chip>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {row.attemptId ? (
                      <Button size="sm" variant="secondary" onPress={() => setOpenId(row.attemptId)}>
                        {t('teacher.open')}
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {openId && review.data ? <AttemptReviewPanel review={review.data} /> : null}
    </div>
  );
}

function AttemptReviewPanel({ review }: { review: TeacherAttemptReview }) {
  const { t } = useTranslation();
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold [overflow-wrap:anywhere]">
        {review.givenName} {review.familyName}
      </h2>
      {review.questions.map((question, index) => (
        <PortalPanel key={question.id}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-xs font-medium text-muted">
              {t('student.questionOf', { current: index + 1, total: review.questions.length })}
            </p>
            <Chip size="sm" color={question.correct ? 'success' : 'danger'} variant="soft">
              {question.correct ? t('assessment.correct') : t('assessment.incorrect')}
            </Chip>
          </div>
          <p className="mt-1 font-medium">{question.prompt}</p>
          {question.textAnswer ? (
            <p className="mt-3 text-sm">
              <span className="text-xs font-medium text-muted">{t('assessment.yourAnswer')}</span>
              <span className="mt-0.5 block">{question.textAnswer}</span>
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {question.options.map((option) => {
                const selected = question.selectedOptionIds.includes(option.id);
                return (
                  <li
                    key={option.id}
                    className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <p
                      className={cn(
                        'min-w-0 text-sm',
                        option.isCorrect && 'text-success',
                        selected && !option.isCorrect && 'text-danger',
                      )}
                    >
                      {option.text}
                    </p>
                    {option.isCorrect || selected ? (
                      <Chip
                        size="sm"
                        color={option.isCorrect ? 'success' : 'danger'}
                        variant="soft"
                        className="shrink-0"
                      >
                        {option.isCorrect ? t('assessment.correct') : t('assessment.yourAnswer')}
                      </Chip>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
          {question.feedback ? (
            <p className="mt-3 text-sm text-muted">
              <span className="text-xs font-medium">{t('assessment.feedback')}</span>
              <span className="mt-0.5 block">{question.feedback}</span>
            </p>
          ) : null}
        </PortalPanel>
      ))}
    </section>
  );
}
