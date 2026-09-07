import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Card, Modal } from '@heroui/react';
import { Award, Clock3, ListChecks, RotateCcw } from 'lucide-react';
import type { StudentAssessmentOverview, StudentAttemptResult, StudentAttemptView } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from './QueryState';
import { StudentPageHeader, StudentPanel } from './StudentChrome';
import { QuizStatusChip } from './StatusChip';
import { usePageTrail } from '@/layouts/PageTrail';
import { QuizHtml } from '@/features/teacher/quizShared';

function OverviewFact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ListChecks;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-xs font-medium text-muted">
        <Icon className="size-3.5 shrink-0" aria-hidden />
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}

export function StudentAssessmentOverviewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const query = useQuery({
    queryKey: ['student-assessment', id],
    queryFn: () => apiFetch<StudentAssessmentOverview>(`/me/assessments/${id}`),
    enabled: Boolean(id),
  });
  usePageTrail(query.data ? [{ label: query.data.title }] : []);
  const result = useQuery({
    queryKey: ['student-attempt-result', query.data?.latestAttemptId],
    queryFn: () => apiFetch<StudentAttemptResult>(`/me/attempts/${query.data?.latestAttemptId}/result`),
    enabled: Boolean(query.data?.latestAttemptId),
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
  const instructions = quiz.instructions.trim();
  const timed = quiz.timeLimitMinutes != null;
  const questionsLabel = t('assessment.questions', { count: quiz.questionCount });
  const timeLabel = timed
    ? t('assessment.timeLimit', { minutes: quiz.timeLimitMinutes })
    : t('assessment.noTimeLimit');
  const attemptsLabel = t('assessment.attempts', {
    used: quiz.attemptsUsed,
    max: quiz.maxAttempts,
  });
  const rules = [
    timed ? t('assessment.ruleTimeLimit', { minutes: quiz.timeLimitMinutes }) : null,
    t('assessment.ruleAttempts', { used: quiz.attemptsUsed, max: quiz.maxAttempts }),
    timed ? t('assessment.ruleAutoSubmit') : null,
  ].filter((rule): rule is string => Boolean(rule));

  return (
    <div className="space-y-6">
      <StudentPageHeader
        title={quiz.title}
        subtitle={quiz.subjectName}
        trailing={<QuizStatusChip status={quiz.status} />}
      />

      <Card className="bg-surface">
        <Card.Content>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <OverviewFact
              icon={ListChecks}
              label={t('assessment.questionsLabel')}
              value={questionsLabel}
            />
            <OverviewFact icon={Clock3} label={t('assessment.timeLimitLabel')} value={timeLabel} />
            <OverviewFact
              icon={RotateCcw}
              label={t('assessment.attemptsLabel')}
              value={attemptsLabel}
            />
            <OverviewFact
              icon={Award}
              label={t('assessment.scoreLabel')}
              value={t('assessment.points', { count: quiz.maxScore })}
            />
          </dl>
        </Card.Content>
      </Card>

      {instructions ? (
        <StudentPanel>
          <p className="text-xs font-medium text-muted">{t('student.instructions')}</p>
          <QuizHtml html={instructions} className="mt-1" />
        </StudentPanel>
      ) : null}

      <StudentPanel>
        <p className="text-xs font-medium text-muted">{t('assessment.beforeYouBegin')}</p>
        <ul className="mt-2 list-disc space-y-1 ps-5 text-sm">
          {rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </StudentPanel>

      {timed ? (
        <Alert status="warning">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t('assessment.timerStarts')}</Alert.Title>
          </Alert.Content>
        </Alert>
      ) : null}

      {result.data ? (
        <StudentPanel>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted">{t('assessment.result')}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {result.data.score} / {result.data.maxScore}
                {` · ${result.data.passed ? t('assessment.passed') : t('assessment.failed')}`}
              </p>
            </div>
            <Link
              to={`/student/assessments/${id}/attempts/${result.data.id}/result`}
              className="text-sm text-accent no-underline hover:underline"
            >
              {t('assessment.viewResults')}
            </Link>
          </div>
        </StudentPanel>
      ) : null}

      {start.isError ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{(start.error as Error).message}</Alert.Title>
          </Alert.Content>
        </Alert>
      ) : null}

      {quiz.inProgressAttemptId ? (
        <Button
          variant="primary"
          onPress={() =>
            navigate(`/student/assessments/${id}/attempts/${quiz.inProgressAttemptId}`)
          }
        >
          {t('student.continue')}
        </Button>
      ) : quiz.canStart ? (
        <Button
          variant="primary"
          onPress={() =>
            navigate(`/student/assessments/${id}/attempts/${quiz.inProgressAttemptId}`)
          }
        >
          {t('student.continue')}
        </Button>
      ) : quiz.canStart ? (
        <Modal>
          <Button variant="primary">{t('assessment.start')}</Button>
          <Modal.Backdrop>
            <Modal.Container>
              <Modal.Dialog>
                <Modal.Header>
                  <Modal.Heading>{quiz.title}</Modal.Heading>
                </Modal.Header>
                <Modal.Body className="space-y-3">
                  <p className="text-sm text-muted">
                    {t('assessment.startFacts', {
                      questions: questionsLabel,
                      time: timeLabel,
                      attempts: attemptsLabel,
                    })}
                  </p>
                  {timed ? <p className="text-sm">{t('assessment.timerStarts')}</p> : null}
                  {start.isError ? (
                    <Alert status="danger">
                      <Alert.Indicator />
                      <Alert.Content>
                        <Alert.Title>{(start.error as Error).message}</Alert.Title>
                      </Alert.Content>
                    </Alert>
                  ) : null}
                </Modal.Body>
                <Modal.Footer>
                  <Button slot="close" variant="tertiary">
                    {t('assessment.cancel')}
                  </Button>
                  <Button
                    variant="primary"
                    onPress={() => start.mutate()}
                    isPending={start.isPending}
                  >
                    {t('assessment.start')}
                  </Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      ) : quiz.attemptsRemaining <= 0 ? (
        <p className="text-sm text-muted">{t('assessment.noAttempts')}</p>
      ) : (
        <p className="text-sm text-muted">{t('assessment.notAvailable')}</p>
      )}
    </div>
  );
}
