import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { StudentAttemptResult } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from './QueryState';
import { StudentPageHeader, StudentPanel } from './StudentChrome';
import { QuizAnswerReview } from './QuizAnswerReview';
import { usePageTrail } from '@/layouts/PageTrail';

function formatDuration(
  startedAt: string,
  submittedAt: string,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  const ms = new Date(submittedAt).getTime() - new Date(startedAt).getTime();
  if (ms < 0) return null;
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return t('assessment.durationSeconds', { seconds });
  if (seconds === 0) return t('assessment.durationMinutes', { minutes });
  return t('assessment.duration', { minutes, seconds });
}

export function StudentAttemptResultPage() {
  const { t } = useTranslation();
  const { id = '', attemptId = '' } = useParams();
  const query = useQuery({
    queryKey: ['student-attempt-result', attemptId],
    queryFn: () => apiFetch<StudentAttemptResult>(`/me/attempts/${attemptId}/result`),
    enabled: Boolean(attemptId),
  });
  usePageTrail(
    query.data
      ? [
          { label: query.data.title, to: `/student/assessments/${id}` },
          { label: t('assessment.result') },
        ]
      : [],
  );

  if (query.isLoading) return <QueryLoading />;
  if (query.isError || !query.data) return <QueryError onRetry={() => void query.refetch()} />;

  const result = query.data;
  const percent = result.maxScore > 0 ? Math.round((result.score / result.maxScore) * 100) : 0;
  const duration =
    result.startedAt && result.submittedAt
      ? formatDuration(result.startedAt, result.submittedAt, t)
      : null;

  return (
    <div className="space-y-6">
      <StudentPageHeader title={result.title} subtitle={t('assessment.result')} />
      <StudentPanel>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-4xl font-semibold tabular-nums tracking-tight">
              {result.score} / {result.maxScore}
            </p>
            <p className="mt-1 text-lg tabular-nums text-muted">{percent}%</p>
          </div>
          <p className="text-sm font-medium">
            {result.passed ? t('assessment.passed') : t('assessment.failed')}
          </p>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4">
          <div>
            <dt className="text-xs font-medium text-muted">{t('assessment.questionsLabel')}</dt>
            <dd className="mt-0.5 text-sm">
              {t('assessment.questions', { count: result.questions.length })}
            </dd>
          </div>
          {duration ? (
            <div>
              <dt className="text-xs font-medium text-muted">{t('assessment.durationLabel')}</dt>
              <dd className="mt-0.5 text-sm">{duration}</dd>
            </div>
          ) : null}
        </dl>
      </StudentPanel>
      <QuizAnswerReview result={result} />
    </div>
  );
}
