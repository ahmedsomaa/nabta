import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, Chip } from '@heroui/react';
import type { StudentAttemptResult } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from './QueryState';

export function StudentAttemptResultPage() {
  const { t } = useTranslation();
  const { id = '', attemptId = '' } = useParams();
  const query = useQuery({
    queryKey: ['student-attempt-result', attemptId],
    queryFn: () => apiFetch<StudentAttemptResult>(`/me/attempts/${attemptId}/result`),
    enabled: Boolean(attemptId),
  });

  if (query.isLoading) return <QueryLoading />;
  if (query.isError || !query.data) return <QueryError onRetry={() => void query.refetch()} />;

  const result = query.data;

  return (
    <div className="space-y-6">
      <Link
        to={`/student/assessments/${id}`}
        className="text-sm text-muted no-underline hover:text-accent"
      >
        {t('assessment.overview')}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">{t('assessment.result')}</h1>
      <Card>
        <Card.Header>
          <Card.Title>{result.title}</Card.Title>
          <Card.Description>
            {t('assessment.score', { score: result.score, max: result.maxScore })}
          </Card.Description>
        </Card.Header>
        <div className="px-4 pb-4">
          <Chip size="sm" color={result.passed ? 'success' : 'danger'} variant="soft">
            {result.passed ? t('assessment.passed') : t('assessment.failed')}
          </Chip>
        </div>
      </Card>
      <div className="space-y-3">
        {result.questions.map((question, index) => (
          <div key={question.id} className="rounded-xl border border-border bg-surface p-4 text-sm">
            <p className="font-medium">
              {index + 1}. {question.prompt}
            </p>
            <p className="mt-1 text-muted">
              {question.awarded === question.points ? t('assessment.correct') : t('assessment.incorrect')}{' '}
              ({question.awarded}/{question.points})
            </p>
            {question.textAnswer ? (
              <p className="mt-2">
                {t('assessment.yourAnswer')}: {question.textAnswer}
              </p>
            ) : (
              <ul className="mt-2 space-y-1">
                {question.options.map((option) => (
                  <li key={option.id}>
                    {option.text}
                    {option.isCorrect ? ` · ${t('assessment.correct')}` : ''}
                    {question.selectedOptionIds.includes(option.id) ? ` · ${t('assessment.yourAnswer')}` : ''}
                  </li>
                ))}
              </ul>
            )}
            {question.feedback ? (
              <p className="mt-2 text-muted">
                {t('assessment.feedback')}: {question.feedback}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
