import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Alert, Button } from '@heroui/react';
import type { StudentAssessmentOverview, StudentAttemptResult, StudentAttemptView } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from './QueryState';
import { StudentPageHeader, StudentPanel } from './StudentChrome';
import { QuizStatusChip } from './StatusChip';
import { QuizAnswerReview, QuizFact } from './QuizAnswerReview';
import { usePageTrail } from '@/layouts/PageTrail';

export function StudentAssessmentOverviewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const query = useQuery({
    queryKey: ['student-assessment', id],
    queryFn: () => apiFetch<StudentAssessmentOverview>(`/me/assessments/${id}`),
    enabled: Boolean(id),
  });
  const result = useQuery({
    queryKey: ['student-attempt-result', query.data?.latestAttemptId],
    queryFn: () => apiFetch<StudentAttemptResult>(`/me/attempts/${query.data?.latestAttemptId}/result`),
    enabled: Boolean(query.data?.latestAttemptId),
  });
  usePageTrail(
    query.data
      ? [
          { label: t('nav.quizzes'), to: '/student/quizzes' },
          { label: query.data.title },
        ]
      : [],
  );
  const start = useMutation({
    mutationFn: () =>
      apiFetch<StudentAttemptView>(`/me/assessments/${id}/start`, { method: 'POST' }),
    onSuccess: (attempt) => {
      navigate(`/student/assessments/${id}/attempts/${attempt.id}`);
    },
  });

  if (query.isLoading) return <QueryLoading />;
  if (query.isError || !query.data) return <QueryError onRetry={() => void query.refetch()} />;

  const quiz = query.data;
  const instructions = quiz.instructions.trim();

  return (
    <div className="space-y-6">
      <StudentPageHeader
        title={quiz.title}
        subtitle={quiz.subjectName}
        trailing={<QuizStatusChip status={quiz.status} />}
      />

      <StudentPanel>
        <dl className="grid grid-cols-2 gap-4">
          <QuizFact label={t('assessment.subject')}>{quiz.subjectName}</QuizFact>
          <QuizFact label={t('assessment.questionsLabel')}>
            {t('assessment.questions', { count: quiz.questionCount })}
          </QuizFact>
          <QuizFact label={t('assessment.timeLimitLabel')}>
            {quiz.timeLimitMinutes
              ? t('assessment.timeLimit', { minutes: quiz.timeLimitMinutes })
              : t('assessment.noTimeLimit')}
          </QuizFact>
          <QuizFact label={t('assessment.passingLabel')}>
            {t('assessment.passing', { score: quiz.passingScore })}
          </QuizFact>
          <QuizFact label={t('assessment.attemptsLabel')}>
            {t('assessment.attempts', { used: quiz.attemptsUsed, max: quiz.maxAttempts })}
          </QuizFact>
          {quiz.bestScore != null ? (
            <QuizFact label={t('assessment.scoreLabel')}>
              {t('assessment.score', { score: quiz.bestScore, max: quiz.maxScore })}
              {quiz.passed != null
                ? ` · ${quiz.passed ? t('assessment.passed') : t('assessment.failed')}`
                : ''}
            </QuizFact>
          ) : null}
        </dl>
        {instructions ? (
          <div className="mt-5 border-t border-border pt-4">
            <p className="text-xs font-medium text-muted">{t('student.instructions')}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm">{instructions}</p>
          </div>
        ) : null}
        {start.isError ? (
          <Alert className="mt-4" status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>{(start.error as Error).message}</Alert.Title>
            </Alert.Content>
          </Alert>
        ) : null}
        <div className="mt-5 border-t border-border pt-4">
          {quiz.inProgressAttemptId ? (
            <Button
              variant="primary"
              onPress={() =>
                navigate(`/student/assessments/${id}/attempts/${quiz.inProgressAttemptId}`)
              }
            >
              {t('assessment.resume')}
            </Button>
          ) : quiz.canStart ? (
            <Button variant="primary" onPress={() => start.mutate()} isPending={start.isPending}>
              {t('assessment.start')}
            </Button>
          ) : (
            <p className="text-sm text-muted">{t('assessment.noAttempts')}</p>
          )}
        </div>
      </StudentPanel>

      {result.data ? <QuizAnswerReview result={result.data} /> : null}
    </div>
  );
}
