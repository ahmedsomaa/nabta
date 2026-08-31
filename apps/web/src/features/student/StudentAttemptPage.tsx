import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Input, Label, TextField } from '@heroui/react';
import type { StudentAttemptResult, StudentAttemptView } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from './QueryState';

function formatRemaining(expiresAt: string | null) {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return '0:00';
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
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

  return (
    <div className="space-y-6">
      <Link
        to={`/student/assessments/${id}`}
        className="text-sm text-muted no-underline hover:text-accent"
      >
        {t('assessment.overview')}
      </Link>
      {clock ? <p className="text-sm font-medium">{t('assessment.timeLeft', { time: clock })}</p> : null}
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
            <div key={question.id} className="space-y-2 rounded-xl border border-border bg-surface p-4">
              <p className="font-medium">
                {index + 1}. {question.prompt}
              </p>
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
              ) : (
                <ul className="space-y-2">
                  {question.options.map((option) => {
                    const checked = draft.optionIds.includes(option.id);
                    const multi = question.type === 'MULTIPLE_ANSWER';
                    return (
                      <li key={option.id}>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type={multi ? 'checkbox' : 'radio'}
                            name={`q-${question.id}`}
                            checked={checked}
                            onChange={() => {
                              const next = multi
                                ? checked
                                  ? draft.optionIds.filter((item) => item !== option.id)
                                  : [...draft.optionIds, option.id]
                                : [option.id];
                              setDrafts((current) => ({
                                ...current,
                                [question.id]: { optionIds: next, textAnswer: '' },
                              }));
                              save.mutate({ questionId: question.id, optionIds: next, textAnswer: null });
                            }}
                          />
                          {option.text}
                        </label>
                      </li>
                    );
                  })}
                </ul>
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
