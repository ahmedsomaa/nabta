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
  Modal,
  Radio,
  RadioGroup,
  TextField,
} from '@heroui/react';
import type { StudentAssessmentOverview, StudentAttemptQuestion, StudentAttemptResult, StudentAttemptView } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from './QueryState';
import { StudentProgress } from './StudentChrome';
import { QuizHtml } from '@/features/teacher/quizShared';
import { cn } from '@/lib/cn';

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

function timerClass(ms: number | null) {
  if (ms == null) return 'text-sm font-medium tabular-nums';
  if (ms < 2 * 60_000) return 'text-sm font-medium tabular-nums text-danger';
  if (ms <= 5 * 60_000) return 'text-sm font-medium tabular-nums text-warning';
  return 'text-sm font-medium tabular-nums';
}

type Draft = { optionIds: string[]; textAnswer: string };

function isDraftAnswered(draft: Draft | undefined, question: StudentAttemptQuestion) {
  const value = draft ?? {
    optionIds: question.selectedOptionIds,
    textAnswer: question.textAnswer ?? '',
  };
  return value.optionIds.length > 0 || value.textAnswer.trim().length > 0;
}

function QuestionNavigator({
  questions,
  currentIndex,
  drafts,
  onSelect,
}: {
  questions: StudentAttemptQuestion[];
  currentIndex: number;
  drafts: Record<string, Draft>;
  onSelect: (index: number) => void;
}) {
  const { t } = useTranslation();
  const answered = questions.filter((question) => isDraftAnswered(drafts[question.id], question)).length;
  const unanswered = questions.length - answered;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">{t('assessment.questionsNav')}</p>
        <p className="mt-0.5 text-xs text-muted">
          {t('student.answeredOf', { answered, total: questions.length })}
          {' · '}
          {t('assessment.unanswered', { count: unanswered })}
        </p>
      </div>
      <ol className="grid grid-cols-5 gap-2 lg:grid-cols-1">
        {questions.map((question, index) => {
          const answeredQuestion = isDraftAnswered(drafts[question.id], question);
          const current = index === currentIndex;
          return (
            <li key={question.id}>
              <button
                type="button"
                onClick={() => onSelect(index)}
                className={cn(
                  'flex w-full items-center justify-center rounded-lg border px-2 py-2 text-sm tabular-nums lg:justify-start lg:px-3',
                  current && 'border-accent bg-accent/10 font-medium text-accent',
                  !current && answeredQuestion && 'border-border bg-surface text-foreground',
                  !current && !answeredQuestion && 'border-dashed border-border text-muted',
                )}
              >
                {index + 1}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function StudentAttemptPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id = '', attemptId = '' } = useParams();
  const [clock, setClock] = useState(() => formatRemaining(null));
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [exitOpen, setExitOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const expirySubmit = useRef(false);
  const seeded = useRef(false);
  const leaving = useRef(false);
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
      leaving.current = true;
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
    onSuccess: () => {
      leaving.current = true;
      navigate(`/student/assessments/${id}/attempts/${attemptId}/result`);
    },
  });

  useEffect(() => {
    if (!query.data?.expiresAt || query.data.status !== 'IN_PROGRESS') return;
    if (new Date(query.data.expiresAt).getTime() > Date.now()) return;
    if (expirySubmit.current || submit.isPending) return;
    expirySubmit.current = true;
    submit.mutate();
  }, [clock, query.data, submit]);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (leaving.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    window.history.pushState({ attemptStay: true }, '');
    const onPopState = () => {
      if (leaving.current) return;
      setExitOpen(true);
      window.history.pushState({ attemptStay: true }, '');
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  if (query.isLoading) {
    return (
      <div className="p-6">
        <QueryLoading />
      </div>
    );
  }
  if (query.isError || !query.data) {
    return (
      <div className="p-6">
        <QueryError onRetry={() => void query.refetch()} />
      </div>
    );
  }

  const attempt = query.data;
  const total = attempt.questions.length;
  const question = attempt.questions[currentIndex];
  const answered = attempt.questions.filter((item) => isDraftAnswered(drafts[item.id], item)).length;
  const unanswered = total - answered;
  const msLeft = remainingMs(attempt.expiresAt);
  const draft = question
    ? (drafts[question.id] ?? {
        optionIds: question.selectedOptionIds,
        textAnswer: question.textAnswer ?? '',
      })
    : { optionIds: [], textAnswer: '' };

  const persistOptions = (questionId: string, optionIds: string[]) => {
    setDrafts((current) => ({
      ...current,
      [questionId]: { optionIds, textAnswer: '' },
    }));
    save.mutate({ questionId, optionIds, textAnswer: null });
  };

  const goNext = () => {
    if (currentIndex < total - 1) {
      setCurrentIndex(currentIndex + 1);
      return;
    }
    const firstUnanswered = attempt.questions.findIndex((item) => !isDraftAnswered(drafts[item.id], item));
    if (firstUnanswered >= 0) setCurrentIndex(firstUnanswered);
  };

  const leaveToOverview = () => {
    leaving.current = true;
    navigate(`/student/assessments/${id}`);
  };

  const selectQuestion = (index: number) => {
    setCurrentIndex(index);
    setNavOpen(false);
  };

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3 md:px-6">
          <Button variant="tertiary" size="sm" onPress={() => setExitOpen(true)}>
            {t('assessment.exit')}
          </Button>
          <p className="min-w-0 flex-1 truncate text-center text-sm font-medium">
            {overview.data?.title ?? t('assessment.overview')}
          </p>
          {clock ? (
            <p className={timerClass(msLeft)}>{t('assessment.timeLeft', { time: clock })}</p>
          ) : (
            <span className="w-16" />
          )}
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 gap-8 px-4 py-6 md:px-6">
        <div className="mx-auto w-full max-w-3xl space-y-5">
          {question ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">
                  {t('student.questionOf', { current: currentIndex + 1, total })}
                </p>
                <Button
                  variant="tertiary"
                  size="sm"
                  className="lg:hidden"
                  onPress={() => setNavOpen(true)}
                >
                  {t('assessment.questionsNav')}
                </Button>
              </div>
              {total > 0 ? (
                <StudentProgress
                  value={Math.round((answered / total) * 100)}
                  label={t('student.answeredOf', { answered, total })}
                />
              ) : null}

              <div className="space-y-3 overflow-hidden rounded-xl border border-border bg-surface p-4">
                <QuizHtml html={question.prompt} className="font-medium" />
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
                    className="gap-2"
                  >
                    <Label className="sr-only">{question.prompt}</Label>
                    {question.options.map((option) => {
                      const selected = draft.optionIds.includes(option.id);
                      return (
                        <Checkbox
                          key={option.id}
                          value={option.id}
                          className={cn(
                            'w-full rounded-xl border px-3 py-3',
                            selected ? 'border-accent bg-accent/10' : 'border-border',
                          )}
                        >
                          <Checkbox.Content>
                            <Checkbox.Control>
                              <Checkbox.Indicator />
                            </Checkbox.Control>
                            {option.text}
                          </Checkbox.Content>
                        </Checkbox>
                      );
                    })}
                  </CheckboxGroup>
                ) : (
                  <RadioGroup
                    name={`q-${question.id}`}
                    value={draft.optionIds[0] ?? ''}
                    onChange={(value) => persistOptions(question.id, value ? [value] : [])}
                    className="gap-2"
                  >
                    <Label className="sr-only">{question.prompt}</Label>
                    {question.options.map((option) => {
                      const selected = draft.optionIds[0] === option.id;
                      return (
                        <Radio
                          key={option.id}
                          value={option.id}
                          className={cn(
                            'w-full rounded-xl border px-3 py-3',
                            selected ? 'border-accent bg-accent/10' : 'border-border',
                          )}
                        >
                          <Radio.Content>
                            <Radio.Control>
                              <Radio.Indicator />
                            </Radio.Control>
                            {option.text}
                          </Radio.Content>
                        </Radio>
                      );
                    })}
                  </RadioGroup>
                )}
                <p className="text-xs text-muted">
                  {save.isPending ? t('assessment.saving') : save.isSuccess ? t('assessment.saved') : null}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  variant="secondary"
                  isDisabled={currentIndex === 0}
                  onPress={() => setCurrentIndex((index) => Math.max(0, index - 1))}
                >
                  {t('assessment.previous')}
                </Button>
                <Button variant="secondary" onPress={goNext}>
                  {currentIndex === total - 1 ? t('assessment.review') : t('assessment.next')}
                </Button>
              </div>
            </>
          ) : null}

          {submit.isError ? (
            <Alert status="danger">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Title>{(submit.error as Error).message}</Alert.Title>
              </Alert.Content>
            </Alert>
          ) : null}

          <Button variant="primary" onPress={() => setSubmitOpen(true)} isPending={submit.isPending}>
            {t('assessment.submit')}
          </Button>
        </div>

        <aside className="hidden w-52 shrink-0 lg:block">
          <div className="sticky top-20">
            <QuestionNavigator
              questions={attempt.questions}
              currentIndex={currentIndex}
              drafts={drafts}
              onSelect={setCurrentIndex}
            />
          </div>
        </aside>
      </div>

      <Modal.Backdrop isOpen={exitOpen} onOpenChange={setExitOpen}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{t('assessment.exitTitle')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <p className="text-sm">{t('assessment.exitBody')}</p>
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close" variant="tertiary">
                {t('assessment.stay')}
              </Button>
              <Button variant="primary" onPress={leaveToOverview}>
                {t('assessment.leave')}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      <Modal.Backdrop isOpen={submitOpen} onOpenChange={setSubmitOpen}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{t('assessment.submitTitle')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="space-y-1">
              <p className="text-sm">{t('assessment.submitAnswered', { answered, total })}</p>
              {unanswered > 0 ? (
                <p className="text-sm text-muted">{t('assessment.unanswered', { count: unanswered })}</p>
              ) : null}
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="tertiary"
                onPress={() => {
                  setSubmitOpen(false);
                  const firstUnanswered = attempt.questions.findIndex(
                    (item) => !isDraftAnswered(drafts[item.id], item),
                  );
                  if (firstUnanswered >= 0) setCurrentIndex(firstUnanswered);
                }}
              >
                {t('assessment.review')}
              </Button>
              <Button
                variant="primary"
                onPress={() => submit.mutate()}
                isPending={submit.isPending}
              >
                {t('assessment.submit')}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      <Modal.Backdrop isOpen={navOpen} onOpenChange={setNavOpen}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{t('assessment.questionsNav')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <QuestionNavigator
                questions={attempt.questions}
                currentIndex={currentIndex}
                drafts={drafts}
                onSelect={selectQuestion}
              />
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close" variant="tertiary">
                {t('assessment.cancel')}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}
