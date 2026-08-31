import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Card } from '@heroui/react';
import type { StudentAssessmentOverview, StudentAttemptView } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from './QueryState';

export function StudentAssessmentOverviewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const query = useQuery({
    queryKey: ['student-assessment', id],
    queryFn: () => apiFetch<StudentAssessmentOverview>(`/me/assessments/${id}`),
    enabled: Boolean(id),
  });
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

  return (
    <div className="space-y-6">
      <Link to="/student/classes" className="text-sm text-muted no-underline hover:text-accent">
        {t('student.backToClasses')}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">{quiz.title}</h1>
      <p className="text-sm text-muted">{quiz.subjectName}</p>
      <Card>
        <Card.Header>
          <Card.Title>{quiz.title}</Card.Title>
          <Card.Description className="whitespace-pre-wrap">{quiz.instructions}</Card.Description>
        </Card.Header>
        <ul className="space-y-1 p-4 pt-0 text-sm text-muted">
          <li>{t('assessment.questions', { count: quiz.questionCount })}</li>
          {quiz.timeLimitMinutes ? (
            <li>{t('assessment.timeLimit', { minutes: quiz.timeLimitMinutes })}</li>
          ) : null}
          <li>{t('assessment.passing', { score: quiz.passingScore })}</li>
          <li>{t('assessment.attempts', { used: quiz.attemptsUsed, max: quiz.maxAttempts })}</li>
          {quiz.bestScore != null ? (
            <li>{t('assessment.score', { score: quiz.bestScore, max: quiz.maxScore })}</li>
          ) : null}
        </ul>
        {start.isError ? (
          <Alert status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>{(start.error as Error).message}</Alert.Title>
            </Alert.Content>
          </Alert>
        ) : null}
        <div className="flex flex-wrap gap-2 px-4 pb-4">
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
      </Card>
    </div>
  );
}
