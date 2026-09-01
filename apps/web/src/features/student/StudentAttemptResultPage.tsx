import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Chip, ProgressCircle } from '@heroui/react';
import type { StudentAttemptResult } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from './QueryState';
import { StudentPageHeader } from './StudentChrome';
import { cn } from '@/lib/cn';
import { usePageTrail } from '@/layouts/PageTrail';

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
          { label: t('nav.quizzes'), to: '/student/quizzes' },
          { label: query.data.title, to: `/student/assessments/${id}` },
          { label: t('assessment.result') },
        ]
      : [],
  );

  if (query.isLoading) return <QueryLoading />;
  if (query.isError || !query.data) return <QueryError onRetry={() => void query.refetch()} />;

  const result = query.data;
  const percent = result.maxScore > 0 ? Math.round((result.score / result.maxScore) * 100) : 0;

  return (
    <div className="space-y-6">
      <StudentPageHeader title={t('assessment.result')} subtitle={result.title} />
      <div className="flex flex-col items-center gap-4 rounded-xl border border-border bg-surface px-5 py-8 text-center">
        <ProgressCircle
          aria-label={t('assessment.score', { score: result.score, max: result.maxScore })}
          color={result.passed ? 'success' : 'danger'}
          value={percent}
        >
          <ProgressCircle.Track>
            <ProgressCircle.TrackCircle />
            <ProgressCircle.FillCircle />
          </ProgressCircle.Track>
        </ProgressCircle>
        <p className="text-3xl font-semibold tracking-tight">{percent}%</p>
        <p className="text-sm text-muted">
          {t('assessment.score', { score: result.score, max: result.maxScore })}
        </p>
        <Chip size="sm" color={result.passed ? 'success' : 'danger'} variant="soft">
          {result.passed ? t('assessment.passed') : t('assessment.failed')}
        </Chip>
      </div>
      <div className="space-y-3">
        {result.questions.map((question, index) => {
          const correct = question.awarded === question.points;
          return (
            <div
              key={question.id}
              className={cn(
                'rounded-xl border border-border bg-surface p-4 text-sm',
                correct ? 'border-s-4 border-s-success' : 'border-s-4 border-s-danger',
              )}
            >
              <p className="text-xs font-medium text-muted">
                {t('student.questionOf', { current: index + 1, total: result.questions.length })}
              </p>
              <p className="font-medium">{question.prompt}</p>
              <p className={cn('mt-1', correct ? 'text-success' : 'text-danger')}>
                {correct ? t('assessment.correct') : t('assessment.incorrect')} (
                {question.awarded}/{question.points})
              </p>
              {question.textAnswer ? (
                <p className="mt-2">
                  {t('assessment.yourAnswer')}: {question.textAnswer}
                </p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {question.options.map((option) => {
                    const selected = question.selectedOptionIds.includes(option.id);
                    return (
                      <li
                        key={option.id}
                        className={cn(
                          option.isCorrect && 'text-success',
                          selected && !option.isCorrect && 'text-danger',
                        )}
                      >
                        {option.text}
                        {option.isCorrect ? ` · ${t('assessment.correct')}` : ''}
                        {selected ? ` · ${t('assessment.yourAnswer')}` : ''}
                      </li>
                    );
                  })}
                </ul>
              )}
              {question.feedback ? (
                <p className="mt-2 text-muted">
                  {t('assessment.feedback')}: {question.feedback}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
