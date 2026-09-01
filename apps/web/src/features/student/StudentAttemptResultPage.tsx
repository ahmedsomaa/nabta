import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { StudentAttemptResult } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from './QueryState';
import { StudentPageHeader, StudentPanel } from './StudentChrome';
import { QuizAnswerReview, QuizFact } from './QuizAnswerReview';
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
      <StudentPageHeader title={result.title} subtitle={t('assessment.result')} />
      <StudentPanel>
        <dl className="grid grid-cols-2 gap-4">
          <QuizFact label={t('assessment.scoreLabel')}>
            {t('assessment.score', { score: result.score, max: result.maxScore })} ({percent}%)
          </QuizFact>
          <QuizFact label={t('assessment.result')}>
            {result.passed ? t('assessment.passed') : t('assessment.failed')}
          </QuizFact>
          <QuizFact label={t('assessment.questionsLabel')}>
            {t('assessment.questions', { count: result.questions.length })}
          </QuizFact>
        </dl>
      </StudentPanel>
      <QuizAnswerReview result={result} />
    </div>
  );
}
