import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Card, Chip } from '@heroui/react';
import { Clock, Hash, Target } from 'lucide-react';
import type { StudentAssessmentOverview, StudentAttemptView } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from './QueryState';
import { StudentPageHeader } from './StudentChrome';
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

  return (
    <div className="space-y-6">
      <StudentPageHeader title={quiz.title} subtitle={quiz.subjectName} />
      <Card className="p-5">
        <Card.Header>
          <Card.Title>{t('assessment.overview')}</Card.Title>
          <Card.Description className="whitespace-pre-wrap">{quiz.instructions}</Card.Description>
        </Card.Header>
        <div className="mt-4 flex flex-wrap gap-2">
          <Chip size="sm" variant="soft">
            <Hash className="size-3" aria-hidden />
            {t('assessment.questions', { count: quiz.questionCount })}
          </Chip>
          {quiz.timeLimitMinutes ? (
            <Chip size="sm" variant="soft">
              <Clock className="size-3" aria-hidden />
              {t('assessment.timeLimit', { minutes: quiz.timeLimitMinutes })}
            </Chip>
          ) : null}
          <Chip size="sm" variant="soft">
            <Target className="size-3" aria-hidden />
            {t('assessment.passing', { score: quiz.passingScore })}
          </Chip>
          <Chip size="sm" variant="soft">
            {t('assessment.attempts', { used: quiz.attemptsUsed, max: quiz.maxAttempts })}
          </Chip>
          {quiz.bestScore != null ? (
            <Chip size="sm" color="accent" variant="soft">
              {t('assessment.score', { score: quiz.bestScore, max: quiz.maxScore })}
            </Chip>
          ) : null}
          {quiz.passed != null ? (
            <Chip size="sm" color={quiz.passed ? 'success' : 'danger'} variant="soft">
              {quiz.passed ? t('assessment.passed') : t('assessment.failed')}
            </Chip>
          ) : null}
        </div>
        {start.isError ? (
          <Alert className="mt-4" status="danger">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Title>{(start.error as Error).message}</Alert.Title>
            </Alert.Content>
          </Alert>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
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
