import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Button,
  Checkbox,
  Dropdown,
  Input,
  Label,
  Modal,
  Radio,
  RadioGroup,
  TextField,
  toast,
} from '@heroui/react';
import { ArrowLeft, Plus } from 'lucide-react';
import type {
  QuestionType,
  TeacherAssessmentDetail,
  TeacherClassItem,
  TeacherQuestion,
} from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from './QueryState';
import { usePageTrail } from '@/layouts/PageTrail';
import { cn } from '@/lib/cn';
import { AssignmentRichTextEditor } from './AssignmentRichTextEditor';
import { QuizQuestionCard } from './QuizQuestionCard';
import {
  QUIZ_TYPES,
  QuizStudentQuestion,
  UNTITLED_QUIZ_TITLE,
  estimatedMinutes,
  fromDatetimeLocal,
  quizPromptPreview,
  toDateInput,
} from './quizShared';
import { stripAssignmentHtml } from './assignmentShared';
import { formatDue } from '@/features/student/StatusChip';

type SaveState = 'idle' | 'editing' | 'saving' | 'saved' | 'error';

function pairValue(classId: string, subjectId: string) {
  return `${classId}:${subjectId}`;
}

function SortableNavItem({
  id,
  children,
}: {
  id: string;
  children: (handle: React.HTMLAttributes<HTMLButtonElement>) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }}>
      {children({ ...attributes, ...listeners } as React.HTMLAttributes<HTMLButtonElement>)}
    </div>
  );
}

export function TeacherAssessmentFormPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id: routeId } = useParams();
  const [searchParams] = useSearchParams();
  const isNew = !routeId || routeId === 'new';
  const createLock = useRef<Promise<string> | null>(null);
  const hydrated = useRef<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const questionTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const classes = useQuery({
    queryKey: ['teacher-classes'],
    queryFn: () => apiFetch<TeacherClassItem[]>('/teacher/classes'),
  });
  const existing = useQuery({
    queryKey: ['teacher-assessment', routeId],
    queryFn: () => apiFetch<TeacherAssessmentDetail>(`/teacher/assessments/${routeId}`),
    enabled: !isNew && Boolean(routeId),
  });

  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [pair, setPair] = useState('');
  const [opensAt, setOpensAt] = useState<string | null>(null);
  const [dueAt, setDueAt] = useState<string | null>(null);
  const [timeLimit, setTimeLimit] = useState('');
  const [maxAttempts, setMaxAttempts] = useState('1');
  const [passingScore, setPassingScore] = useState('60');
  const [randomize, setRandomize] = useState(false);
  const [questions, setQuestions] = useState<TeacherQuestion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [preview, setPreview] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [blocked, setBlocked] = useState<string[] | null>(null);

  const selectedClass = classes.data?.find((item) => pairValue(item.classId, item.subjectId) === pair);
  const assessmentId = isNew ? null : routeId;
  const totalPoints = questions.reduce((sum, question) => sum + question.points, 0);

  useEffect(() => {
    if (!isNew || pair || !classes.data?.length) return;
    const classId = searchParams.get('classId');
    const subjectId = searchParams.get('subjectId');
    const match = classes.data.find((item) => item.classId === classId && item.subjectId === subjectId);
    const first = match ?? classes.data[0];
    if (first) setPair(pairValue(first.classId, first.subjectId));
  }, [isNew, classes.data, pair, searchParams]);

  useEffect(() => {
    if (!existing.data || hydrated.current === existing.data.id) return;
    hydrated.current = existing.data.id;
    setTitle(existing.data.title === UNTITLED_QUIZ_TITLE ? '' : existing.data.title);
    setInstructions(existing.data.instructions);
    setPair(pairValue(existing.data.classId, existing.data.subjectId));
    setOpensAt(existing.data.opensAt);
    setDueAt(existing.data.dueAt);
    setTimeLimit(existing.data.timeLimitMinutes != null ? String(existing.data.timeLimitMinutes) : '');
    setMaxAttempts(String(existing.data.maxAttempts));
    setPassingScore(String(existing.data.passingScore));
    setRandomize(existing.data.randomizeQuestions);
    setQuestions(existing.data.questions);
    setSelectedId(existing.data.questions[0]?.id ?? null);
    setDirty(false);
  }, [existing.data]);

  usePageTrail([{ label: isNew ? t('teacher.createQuiz') : (existing.data?.title ?? t('nav.quizzes')) }]);

  const settingsPayload = useCallback(() => {
    const [classId, subjectId] = pair.split(':');
    return {
      title: title.trim(),
      instructions,
      classId,
      subjectId,
      unitId: searchParams.get('unitId') || undefined,
      timeLimitMinutes: timeLimit ? Number(timeLimit) : null,
      maxAttempts: Number(maxAttempts) || 1,
      passingScore: Number(passingScore) || 60,
      randomizeQuestions: randomize,
      opensAt,
      dueAt,
    };
  }, [pair, title, instructions, searchParams, timeLimit, maxAttempts, passingScore, randomize, opensAt, dueAt]);

  const ensureId = useCallback(async () => {
    if (assessmentId) return assessmentId;
    if (createLock.current) return createLock.current;
    const [classId, subjectId] = pair.split(':');
    if (!classId || !subjectId) throw new Error(t('teacher.classSubject'));
    createLock.current = apiFetch<TeacherAssessmentDetail>('/teacher/assessments', {
      method: 'POST',
      body: JSON.stringify(settingsPayload()),
    }).then((row) => {
      void queryClient.invalidateQueries({ queryKey: ['teacher-assessments'] });
      navigate(`/teacher/assessments/${row.id}/edit`, { replace: true });
      return row.id;
    });
    return createLock.current;
  }, [assessmentId, pair, settingsPayload, queryClient, navigate, t]);

  const persistSettings = useCallback(async () => {
    setSaveState('saving');
    try {
      const id = await ensureId();
      const row = await apiFetch<TeacherAssessmentDetail>(`/teacher/assessments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(settingsPayload()),
      });
      void queryClient.invalidateQueries({ queryKey: ['teacher-assessments'] });
      void queryClient.setQueryData(['teacher-assessment', row.id], row);
      setDirty(false);
      setSaveState('saved');
    } catch {
      setSaveState('error');
    }
  }, [ensureId, settingsPayload, queryClient]);

  useEffect(() => {
    if (!dirty) return;
    setSaveState('editing');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void persistSettings();
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [dirty, persistSettings]);

  const refreshQuestions = (id: string) =>
    queryClient.invalidateQueries({ queryKey: ['teacher-assessment', id] });

  const patchQuestion = (questionId: string, body: Record<string, unknown>) => {
    if (questionTimers.current[questionId]) clearTimeout(questionTimers.current[questionId]);
    setSaveState('editing');
    questionTimers.current[questionId] = setTimeout(async () => {
      setSaveState('saving');
      try {
        const id = await ensureId();
        await apiFetch(`/teacher/questions/${questionId}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
        void refreshQuestions(id);
        setSaveState('saved');
      } catch {
        setSaveState('error');
      }
    }, 500);
  };

  const addQuestion = async (type: QuestionType) => {
    setSaveState('saving');
    try {
      const id = await ensureId();
      const created = await apiFetch<TeacherQuestion>(`/teacher/assessments/${id}/questions`, {
        method: 'POST',
        body: JSON.stringify({ type, prompt: '' }),
      });
      setQuestions((current) => [...current, created]);
      setSelectedId(created.id);
      void refreshQuestions(id);
      setSaveState('saved');
    } catch (error) {
      setSaveState('error');
      toast.danger((error as Error).message);
    }
  };

  const duplicateQuestion = async (question: TeacherQuestion) => {
    const id = await ensureId();
    const created = await apiFetch<TeacherQuestion>(`/teacher/assessments/${id}/questions`, {
      method: 'POST',
      body: JSON.stringify({
        type: question.type,
        prompt: question.prompt,
        points: question.points,
        feedback: question.feedback,
        options: question.options.map((option) => ({ text: option.text, isCorrect: option.isCorrect })),
      }),
    });
    setQuestions((current) => [...current, created]);
    setSelectedId(created.id);
    void refreshQuestions(id);
  };

  const deleteQuestion = async (questionId: string) => {
    await apiFetch(`/teacher/questions/${questionId}`, { method: 'DELETE' });
    setQuestions((current) => current.filter((question) => question.id !== questionId));
    if (selectedId === questionId) setSelectedId(questions.find((question) => question.id !== questionId)?.id ?? null);
    if (assessmentId) void refreshQuestions(assessmentId);
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = questions.map((question) => question.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    const next = arrayMove(questions, oldIndex, newIndex);
    setQuestions(next);
    const id = await ensureId();
    await apiFetch(`/teacher/assessments/${id}/questions/reorder`, {
      method: 'POST',
      body: JSON.stringify({ ids: next.map((question) => question.id) }),
    });
  };

  const publishIssues = () => {
    const issues: string[] = [];
    if (!title.trim()) issues.push(t('teacher.quizNeedsTitle'));
    if (questions.length === 0) issues.push(t('teacher.quizNeedsQuestion'));
    questions.forEach((question, index) => {
      if (!stripAssignmentHtml(question.prompt)) {
        issues.push(t('teacher.quizNeedsPrompt', { number: index + 1 }));
      }
      if (!question.options.some((option) => option.isCorrect && option.text.trim())) {
        issues.push(t('teacher.quizNeedsCorrect', { number: index + 1 }));
      }
    });
    return issues;
  };

  const publish = useMutation({
    mutationFn: async () => {
      const id = await persistSettings().then(() => ensureId());
      return apiFetch<TeacherAssessmentDetail>(`/teacher/assessments/${id}/publish`, { method: 'POST' });
    },
    onSuccess: (row) => {
      void queryClient.invalidateQueries({ queryKey: ['teacher-assessments'] });
      navigate(`/teacher/assessments/${row.id}`);
    },
    onError: (error: Error) => toast.danger(error.message),
  });

  const markDirty = () => setDirty(true);

  if (!isNew && existing.isLoading) return <QueryLoading variant="assignment" />;
  if (!isNew && (existing.isError || !existing.data)) {
    return <QueryError onRetry={() => void existing.refetch()} />;
  }

  const saveLabel =
    saveState === 'saving'
      ? t('teacher.saving')
      : saveState === 'saved'
        ? t('teacher.savedJustNow')
        : saveState === 'editing'
          ? t('teacher.editing')
          : saveState === 'error'
            ? t('teacher.saveFailed')
            : null;

  return (
    <div className="-mx-4 flex min-h-[calc(100svh-8rem)] flex-col md:-mx-6">
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur md:px-6">
        <div className="min-w-0">
          <Link
            to="/teacher/assessments"
            className="inline-flex items-center gap-1 text-sm text-muted no-underline hover:text-accent"
          >
            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
            {t('nav.quizzes')}
          </Link>
          <h1 className="text-lg font-semibold tracking-tight">
            {title.trim() || t('teacher.createQuiz')}
          </h1>
          {saveLabel ? <p className="text-xs text-muted">{saveLabel}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onPress={() => setPreview((value) => !value)}>
            {preview ? t('teacher.backToEditor') : t('teacher.preview')}
          </Button>
          <Button
            variant="primary"
            isPending={publish.isPending}
            onPress={() => {
              const issues = publishIssues();
              if (issues.length) {
                setBlocked(issues);
                return;
              }
              setPublishOpen(true);
            }}
          >
            {t('teacher.publish')}
          </Button>
        </div>
      </header>

      {preview ? (
        <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{t('teacher.studentView')}</p>
          <h2 className="text-2xl font-semibold">{title.trim() || t('teacher.createQuiz')}</h2>
          <p className="text-sm text-muted">
            {t('teacher.quizSummary', {
              questions: questions.length,
              points: totalPoints,
              minutes: estimatedMinutes(questions.length, timeLimit ? Number(timeLimit) : null),
            })}
          </p>
          {questions.map((question, index) => (
            <QuizStudentQuestion
              key={question.id}
              index={index}
              total={questions.length}
              type={question.type}
              prompt={question.prompt}
              options={question.options}
            />
          ))}
        </div>
      ) : (
        <div className="grid flex-1 gap-0 xl:grid-cols-[13.75rem_minmax(0,1fr)_18.75rem]">
          <aside className="border-b border-border p-3 xl:border-b-0 xl:border-e">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
              {t('nav.quizzes')}
            </p>
            <AddQuestionMenu onAdd={addQuestion} />
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => void onDragEnd(event)}>
              <SortableContext items={questions.map((question) => question.id)} strategy={verticalListSortingStrategy}>
                <ol className="mt-3 space-y-1">
                  {questions.map((question, index) => (
                    <SortableNavItem key={question.id} id={question.id}>
                      {(handle) => (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(question.id);
                            document.getElementById(`question-${question.id}`)?.scrollIntoView({
                              behavior: 'smooth',
                              block: 'start',
                            });
                          }}
                          className={cn(
                            'flex w-full items-start gap-2 rounded-lg px-2 py-2 text-start text-sm',
                            selectedId === question.id ? 'bg-accent/10 text-foreground' : 'hover:bg-overlay',
                          )}
                        >
                          <span className="mt-0.5 text-muted" {...handle}>
                            {String(index + 1).padStart(2, '0')}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs text-muted">
                              {t(`teacher.questionTypes.${question.type}`)}
                            </span>
                            <span className="block truncate">
                              {quizPromptPreview(question.prompt, t('teacher.prompt'))}
                            </span>
                          </span>
                          <span className="tabular-nums text-xs text-muted">{question.points}</span>
                        </button>
                      )}
                    </SortableNavItem>
                  ))}
                </ol>
              </SortableContext>
            </DndContext>
          </aside>

          <div className="min-w-0 space-y-4 overflow-y-auto p-4">
            <section className="space-y-3 rounded-xl border border-border bg-surface p-4">
              <TextField name="quiz-title" value={title} onChange={(value) => { setTitle(value); markDirty(); }}>
                <Label>{t('teacher.title')}</Label>
                <Input />
              </TextField>
              <div>
                <p className="mb-1 text-sm font-medium">{t('teacher.instructions')}</p>
                <AssignmentRichTextEditor
                  compact
                  value={instructions}
                  onChange={(value) => {
                    setInstructions(value);
                    markDirty();
                  }}
                  placeholder={t('teacher.instructions')}
                />
              </div>
            </section>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => void onDragEnd(event)}>
              <SortableContext items={questions.map((question) => question.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {questions.map((question, index) => (
                    <SortableNavItem key={question.id} id={question.id}>
                      {(handle) => (
                        <QuizQuestionCard
                          index={index}
                          question={question}
                          selected={selectedId === question.id}
                          onSelect={() => setSelectedId(question.id)}
                          dragHandle={handle}
                          onPrompt={(value) => {
                            setQuestions((current) =>
                              current.map((row) => (row.id === question.id ? { ...row, prompt: value } : row)),
                            );
                            patchQuestion(question.id, { prompt: value });
                          }}
                          onPoints={(value) => {
                            setQuestions((current) =>
                              current.map((row) => (row.id === question.id ? { ...row, points: value } : row)),
                            );
                            patchQuestion(question.id, { points: value });
                          }}
                          onFeedback={(value) => {
                            setQuestions((current) =>
                              current.map((row) => (row.id === question.id ? { ...row, feedback: value } : row)),
                            );
                            patchQuestion(question.id, { feedback: value });
                          }}
                          onType={(type) => void convertType(question, type)}
                          onOptionText={(optionId, text) => void updateOption(optionId, { text })}
                          onOptionCorrect={(optionId, isCorrect) => void markCorrect(question, optionId, isCorrect)}
                          onAddOption={() => void addOption(question)}
                          onDeleteOption={(optionId) => void deleteOption(question.id, optionId)}
                          onDuplicate={() => void duplicateQuestion(question)}
                          onDelete={() => void deleteQuestion(question.id)}
                        />
                      )}
                    </SortableNavItem>
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <div className="rounded-xl border border-dashed border-border py-8 text-center">
              <AddQuestionMenu onAdd={addQuestion} />
              <p className="mt-3 text-sm text-muted">
                {t('teacher.quizSummary', {
                  questions: questions.length,
                  points: totalPoints,
                  minutes: estimatedMinutes(questions.length, timeLimit ? Number(timeLimit) : null),
                })}
              </p>
            </div>
          </div>

          <aside className="border-t border-border p-4 xl:sticky xl:top-[4.25rem] xl:h-fit xl:border-s xl:border-t-0">
            <p className="text-sm font-semibold">{t('teacher.quizSettings')}</p>
            <div className="mt-3 space-y-3 text-sm">
              <label className="grid gap-1">
                <span className="text-xs font-medium text-muted">{t('teacher.classSubject')}</span>
                <select
                  className="rounded-lg border border-border bg-background px-3 py-2"
                  value={pair}
                  disabled={!isNew && Boolean(existing.data)}
                  onChange={(event) => {
                    setPair(event.target.value);
                    markDirty();
                  }}
                >
                  {(classes.data ?? []).map((item) => (
                    <option key={pairValue(item.classId, item.subjectId)} value={pairValue(item.classId, item.subjectId)}>
                      {item.className} — {item.subjectName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-muted">{t('teacher.opensAt')}</span>
                <input
                  type="datetime-local"
                  className="rounded-lg border border-border bg-background px-3 py-2"
                  value={toDateInput(opensAt)}
                  onChange={(event) => {
                    setOpensAt(fromDatetimeLocal(event.target.value));
                    markDirty();
                  }}
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-medium text-muted">{t('teacher.dueDate')}</span>
                <input
                  type="datetime-local"
                  className="rounded-lg border border-border bg-background px-3 py-2"
                  value={toDateInput(dueAt)}
                  onChange={(event) => {
                    setDueAt(fromDatetimeLocal(event.target.value));
                    markDirty();
                  }}
                />
              </label>
              <div>
                <p className="text-xs font-medium text-muted">{t('teacher.timeLimit')}</p>
                <RadioGroup
                  value={timeLimit ? 'limit' : 'none'}
                  onChange={(value) => {
                    if (value === 'none') setTimeLimit('');
                    else if (!timeLimit) setTimeLimit('30');
                    markDirty();
                  }}
                  className="mt-1 gap-1"
                >
                  <Radio value="none">
                    <Radio.Control>
                      <Radio.Indicator />
                    </Radio.Control>
                    <Radio.Content>
                      <Label>{t('teacher.noTimeLimit')}</Label>
                    </Radio.Content>
                  </Radio>
                  <Radio value="limit">
                    <Radio.Control>
                      <Radio.Indicator />
                    </Radio.Control>
                    <Radio.Content>
                      <Label>{t('teacher.minutesShort', { count: Number(timeLimit) || 30 })}</Label>
                    </Radio.Content>
                  </Radio>
                </RadioGroup>
                {timeLimit ? (
                  <TextField
                    name="time-limit"
                    value={timeLimit}
                    onChange={(value) => {
                      setTimeLimit(value);
                      markDirty();
                    }}
                    className="mt-2"
                  >
                    <Label className="sr-only">{t('teacher.timeLimit')}</Label>
                    <Input type="number" min={1} max={240} />
                  </TextField>
                ) : null}
              </div>
              <TextField
                name="attempts"
                value={maxAttempts}
                onChange={(value) => {
                  setMaxAttempts(value);
                  markDirty();
                }}
              >
                <Label>{t('teacher.maxAttempts')}</Label>
                <Input type="number" min={1} max={20} />
              </TextField>
              <TextField
                name="passing"
                value={passingScore}
                onChange={(value) => {
                  setPassingScore(value);
                  markDirty();
                }}
              >
                <Label>{t('teacher.passingScore')}</Label>
                <Input type="number" min={0} max={100} />
              </TextField>
              <p className="text-xs text-muted">
                {t('teacher.totalPoints')}: {totalPoints}
              </p>
              <button
                type="button"
                className="text-sm text-accent"
                onClick={() => setAdvanced((value) => !value)}
              >
                {t('teacher.advancedSettings')}
              </button>
              {advanced ? (
                <Checkbox isSelected={randomize} onChange={(selected) => { setRandomize(selected); markDirty(); }}>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <Checkbox.Content>
                    <Label>{t('teacher.randomize')}</Label>
                  </Checkbox.Content>
                </Checkbox>
              ) : null}
            </div>
          </aside>
        </div>
      )}

      <Modal.Backdrop isOpen={publishOpen} onOpenChange={setPublishOpen}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{t('teacher.readyToPublishQuiz')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="space-y-1 text-sm">
              <p className="font-medium">{title.trim()}</p>
              {selectedClass ? (
                <p className="text-muted">
                  {selectedClass.className} — {selectedClass.subjectName}
                </p>
              ) : null}
              <p>
                {t('teacher.quizSummary', {
                  questions: questions.length,
                  points: totalPoints,
                  minutes: estimatedMinutes(questions.length, timeLimit ? Number(timeLimit) : null),
                })}
              </p>
              {opensAt ? (
                <p>
                  {t('teacher.opensAt')}: {formatDue(opensAt, i18n.language)}
                </p>
              ) : null}
              {dueAt ? (
                <p>
                  {t('teacher.dueDate')}: {formatDue(dueAt, i18n.language)}
                </p>
              ) : null}
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close" variant="tertiary">
                {t('teacher.backToEditing')}
              </Button>
              <Button variant="primary" isPending={publish.isPending} onPress={() => publish.mutate()}>
                {t('teacher.publishQuiz')}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>

      <Modal.Backdrop isOpen={Boolean(blocked)} onOpenChange={() => setBlocked(null)}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{t('teacher.cantPublishQuiz')}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <ul className="list-disc ps-5 text-sm">
                {(blocked ?? []).map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close" variant="primary">
                {t('teacher.backToEditing')}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );

  async function convertType(question: TeacherQuestion, type: QuestionType) {
    await apiFetch(`/teacher/questions/${question.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ type }),
    });
    if (assessmentId) {
      const row = await apiFetch<TeacherAssessmentDetail>(`/teacher/assessments/${assessmentId}`);
      setQuestions(row.questions);
      void queryClient.setQueryData(['teacher-assessment', assessmentId], row);
    }
  }

  async function updateOption(optionId: string, body: { text?: string; isCorrect?: boolean }) {
    await apiFetch(`/teacher/options/${optionId}`, { method: 'PATCH', body: JSON.stringify(body) });
    if (assessmentId) void refreshQuestions(assessmentId);
    setQuestions((current) =>
      current.map((question) => ({
        ...question,
        options: question.options.map((option) => (option.id === optionId ? { ...option, ...body } : option)),
      })),
    );
  }

  async function markCorrect(question: TeacherQuestion, optionId: string, isCorrect: boolean) {
    if (question.type === 'MULTIPLE_CHOICE' || question.type === 'TRUE_FALSE') {
      await Promise.all(
        question.options.map((option) =>
          apiFetch(`/teacher/options/${option.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ isCorrect: option.id === optionId }),
          }),
        ),
      );
      setQuestions((current) =>
        current.map((row) =>
          row.id === question.id
            ? {
                ...row,
                options: row.options.map((option) => ({ ...option, isCorrect: option.id === optionId })),
              }
            : row,
        ),
      );
      return;
    }
    await updateOption(optionId, { isCorrect });
  }

  async function addOption(question: TeacherQuestion) {
    const created = await apiFetch<TeacherQuestion['options'][number]>(
      `/teacher/questions/${question.id}/options`,
      {
        method: 'POST',
        body: JSON.stringify({
          text: question.type === 'SHORT_ANSWER' ? t('teacher.acceptedAnswer') : t('teacher.optionLabel'),
          isCorrect: question.type === 'SHORT_ANSWER',
        }),
      },
    );
    setQuestions((current) =>
      current.map((row) => (row.id === question.id ? { ...row, options: [...row.options, created] } : row)),
    );
  }

  async function deleteOption(questionId: string, optionId: string) {
    await apiFetch(`/teacher/options/${optionId}`, { method: 'DELETE' });
    setQuestions((current) =>
      current.map((row) =>
        row.id === questionId
          ? { ...row, options: row.options.filter((option) => option.id !== optionId) }
          : row,
      ),
    );
  }
}

function AddQuestionMenu({ onAdd }: { onAdd: (type: QuestionType) => void }) {
  const { t } = useTranslation();
  return (
    <Dropdown>
      <Dropdown.Trigger>
        <Button size="sm" variant="secondary" className="w-full">
          <Plus className="size-3.5" />
          {t('teacher.addQuestion')}
        </Button>
      </Dropdown.Trigger>
      <Dropdown.Popover>
        <Dropdown.Menu
          onAction={(key) => {
            const type = String(key) as QuestionType;
            if (QUIZ_TYPES.includes(type)) onAdd(type);
          }}
        >
          {QUIZ_TYPES.map((type) => (
            <Dropdown.Item key={type} id={type} textValue={t(`teacher.questionTypes.${type}`)}>
              {t(`teacher.questionTypes.${type}`)}
            </Dropdown.Item>
          ))}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
