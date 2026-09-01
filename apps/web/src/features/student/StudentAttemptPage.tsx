import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  Button,
  Checkbox,
  CheckboxGroup,
  Input,
  Label,
  Radio,
  RadioGroup,
  TextField,
} from '@heroui/react';
import type { StudentAssessmentOverview, StudentAttemptResult, StudentAttemptView } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from './QueryState';
import { StudentPageHeader, StudentProgress } from './StudentChrome';
import { cn } from '@/lib/cn';
import { usePageTrail } from '@/layouts/PageTrail';

function formatRemaining(expiresAt: string | null) {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return '0:00';
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function remainingMs(expiresAt: string | null) {
  if (!expiresAt) return null;
  return new Date(expiresAt).getTime() - Date.now();
}

type Draft = { optionIds: string[]; textAnswer: string };

export function StudentAttemptPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id = '', attemptId = '' } = useParams();
  const [clock, setClock] = useState(() => formatRemaining(null));
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const expirySubmit = useRef(false);
  const seeded = useRef(false);
  const textTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const query = useQuery({
    queryKey: ['student-attempt', attemptId],
    queryFn: () => apiFetch<StudentAttemptView>(`/me/attempts/${attemptId}`),
    enabled: Boolean(attemptId),
    refetchInterval: 15_000,
  });
  const overview = useQuery({
    queryKey: ['student-assessment', id],
    queryFn: () => apiFetch<StudentAssessmentOverview>(`/me/assessments/${id}`),
    enabled: Boolean(id),
  });
  usePageTrail(
    overview.data
      ? [
          { label: t('nav.quizzes'), to: '/student/quizzes' },
          { label: overview.data.title, to: `/student/assessments/${id}` },
          { label: t('assessment.statusInProgress') },
        ]
      : [],
  );

  useEffect(() => {
    if (!query.data || seeded.current) return;
    seeded.current = true;
    setDrafts(
      Object.fromEntries(
        query.data.questions.map((question) => [
          question.id,
          { optionIds: question.selectedOptionIds, textAnswer: question.textAnswer ?? '' },
        ]),
      ),
    );
  }, [query.data]);

  useEffect(() => {
    const expiresAt = query.data?.expiresAt ?? null;
    setClock(formatRemaining(expiresAt));
    const timer = setInterval(() => setClock(formatRemaining(expiresAt)), 1000);
    return () => clearInterval(timer);
  }, [query.data?.expiresAt]);

  useEffect(() => {
    if (!query.data) return;
    if (query.data.status !== 'IN_PROGRESS') {
      navigate(`/student/assessments/${id}/attempts/${attemptId}/result`, { replace: true });
    }
  }, [query.data, id, attemptId, navigate]);

  const save = useMutation({
    mutationFn: (body: { questionId: string; optionIds?: string[]; textAnswer?: string | null }) =>
      apiFetch(`/me/attempts/${attemptId}/answers`, { method: 'PATCH', body: JSON.stringify(body) }),
  });
  const submit = useMutation({
    mutationFn: () =>
      apiFetch<StudentAttemptResult>(`/me/attempts/${attemptId}/submit`, { method: 'POST' }),
    onSuccess: () => navigate(`/student/assessments/${id}/attempts/${attemptId}/result`),
  });

  useEffect(() => {
    if (!query.data?.expiresAt || query.data.status !== 'IN_PROGRESS') return;
    if (new Date(query.data.expiresAt).getTime() > Date.now()) return;
    if (expirySubmit.current || submit.isPending) return;
    expirySubmit.current = true;
    submit.mutate();
  }, [clock, query.data, submit]);

  if (query.isLoading) return <QueryLoading />;
  if (query.isError || !query.data) return <QueryError onRetry={() => void query.refetch()} />;

  const attempt = query.data;
  const total = attempt.questions.length;
  const answered = attempt.questions.filter((question) => {
    const draft = drafts[question.id] ?? {
      optionIds: question.selectedOptionIds,
      textAnswer: question.textAnswer ?? '',
    };
    return draft.optionIds.length > 0 || draft.textAnswer.trim().length > 0;
  }).length;
  const msLeft = remainingMs(attempt.expiresAt);
  const timerLow = msLeft != null && msLeft > 0 && msLeft <= 2 * 60 * 1000;

  const persistOptions = (questionId: string, optionIds: string[]) => {
    setDrafts((current) => ({
      ...current,
      [questionId]: { optionIds, textAnswer: '' },
    }));
    save.mutate({ questionId, optionIds, textAnswer: null });
  };

  return (
    <div className="space-y-6">
      <StudentPageHeader title={overview.data?.title ?? t('assessment.overview')} />

      <div className="sticky top-0 z-10 -mx-4 space-y-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:-mx-6 md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {clock ? (
            <p className={cn('text-sm font-medium', timerLow && 'text-warning')}>
              {t('assessment.timeLeft', { time: clock })}
            </p>
          ) : (
            <span />
          )}
          <p className="text-sm text-muted">
            {t('student.answeredOf', { answered, total })}
          </p>
        </div>
        {total > 0 ? (
          <StudentProgress
            value={Math.round((answered / total) * 100)}
            label={t('student.answeredOf', { answered, total })}
          />
        ) : null}
      </div>

      {submit.isError ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{(submit.error as Error).message}</Alert.Title>
          </Alert.Content>
        </Alert>
      ) : null}
      <div className="space-y-5">
        {attempt.questions.map((question, index) => {
          const draft = drafts[question.id] ?? {
            optionIds: question.selectedOptionIds,
            textAnswer: question.textAnswer ?? '',
          };
          return (
            <div key={question.id} className="space-y-3 overflow-hidden rounded-xl border border-border p-4">
              <p className="text-xs font-medium text-muted">
                {t('student.questionOf', { current: index + 1, total })}
              </p>
              <p className="font-medium">{question.prompt}</p>
              {question.type === 'SHORT_ANSWER' ? (
                <TextField
                  name={`q-${question.id}`}
                  value={draft.textAnswer}
                  onChange={(value) => {
                    setDrafts((current) => ({
                      ...current,
                      [question.id]: { optionIds: [], textAnswer: value },
                    }));
                    if (textTimers.current[question.id]) clearTimeout(textTimers.current[question.id]);
                    textTimers.current[question.id] = setTimeout(() => {
                      save.mutate({ questionId: question.id, textAnswer: value, optionIds: [] });
                    }, 400);
                  }}
                >
                  <Label>{t('assessment.yourAnswer')}</Label>
                  <Input />
                </TextField>
              ) : question.type === 'MULTIPLE_ANSWER' ? (
                <CheckboxGroup
                  name={`q-${question.id}`}
                  value={draft.optionIds}
                  onChange={(value) => persistOptions(question.id, value)}
                >
                  <Label className="sr-only">{question.prompt}</Label>
                  {question.options.map((option) => (
                    <Checkbox key={option.id} value={option.id}>
                      <Checkbox.Content>
                        <Checkbox.Control>
                          <Checkbox.Indicator />
                        </Checkbox.Control>
                        {option.text}
                      </Checkbox.Content>
                    </Checkbox>
                  ))}
                </CheckboxGroup>
              ) : (
                <RadioGroup
                  name={`q-${question.id}`}
                  value={draft.optionIds[0] ?? ''}
                  onChange={(value) => persistOptions(question.id, value ? [value] : [])}
                >
                  <Label className="sr-only">{question.prompt}</Label>
                  {question.options.map((option) => (
                    <Radio key={option.id} value={option.id}>
                      <Radio.Content>
                        <Radio.Control>
                          <Radio.Indicator />
                        </Radio.Control>
                        {option.text}
                      </Radio.Content>
                    </Radio>
                  ))}
                </RadioGroup>
              )}
            </div>
          );
        })}
      </div>
      <Button variant="primary" onPress={() => submit.mutate()} isPending={submit.isPending}>
        {t('assessment.submit')}
      </Button>
    </div>
  );
}
