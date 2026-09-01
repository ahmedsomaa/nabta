import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Input, Label, TextArea, TextField, toast } from '@heroui/react';
import type {
  QuestionType,
  TeacherAssessmentDetail,
  TeacherClassItem,
  TeacherQuestion,
  TeacherQuestionOption,
} from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from './QueryState';
import { PortalPageHeader, PortalPanel } from '@/components/portal/PortalChrome';
import { usePageTrail } from '@/layouts/PageTrail';

const TYPES: QuestionType[] = ['MULTIPLE_CHOICE', 'MULTIPLE_ANSWER', 'TRUE_FALSE', 'SHORT_ANSWER'];

export function TeacherAssessmentFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const [params] = useSearchParams();
  const isNew = !id || id === 'new';

  const classes = useQuery({
    queryKey: ['teacher-classes'],
    queryFn: () => apiFetch<TeacherClassItem[]>('/teacher/classes'),
  });
  const existing = useQuery({
    queryKey: ['teacher-assessment', id],
    queryFn: () => apiFetch<TeacherAssessmentDetail>(`/teacher/assessments/${id}`),
    enabled: !isNew && Boolean(id),
  });

  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [pair, setPair] = useState('');
  const [timeLimit, setTimeLimit] = useState('10');
  const [maxAttempts, setMaxAttempts] = useState('2');
  const [passingScore, setPassingScore] = useState('60');
  const [randomize, setRandomize] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!existing.data) return;
    setTitle(existing.data.title);
    setInstructions(existing.data.instructions);
    setPair(`${existing.data.classId}:${existing.data.subjectId}`);
    setTimeLimit(existing.data.timeLimitMinutes != null ? String(existing.data.timeLimitMinutes) : '');
    setMaxAttempts(String(existing.data.maxAttempts));
    setPassingScore(String(existing.data.passingScore));
    setRandomize(existing.data.randomizeQuestions);
  }, [existing.data]);

  useEffect(() => {
    if (!isNew) return;
    const classId = params.get('classId');
    const subjectId = params.get('subjectId');
    if (classId && subjectId) {
      setPair(`${classId}:${subjectId}`);
    } else if (classes.data?.[0] && !pair) {
      setPair(`${classes.data[0].classId}:${classes.data[0].subjectId}`);
    }
  }, [isNew, classes.data, pair, params]);

  const payload = () => {
    const [classId, subjectId] = pair.split(':');
    return {
      title,
      instructions,
      classId,
      subjectId,
      unitId: params.get('unitId') || undefined,
      timeLimitMinutes: timeLimit ? Number(timeLimit) : null,
      maxAttempts: Number(maxAttempts) || 1,
      passingScore: Number(passingScore) || 60,
      randomizeQuestions: randomize,
    };
  };

  const save = useMutation({
    mutationFn: async (publish: boolean) => {
      const row = isNew
        ? await apiFetch<TeacherAssessmentDetail>('/teacher/assessments', {
            method: 'POST',
            body: JSON.stringify(payload()),
          })
        : await apiFetch<TeacherAssessmentDetail>(`/teacher/assessments/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload()),
          });
      if (publish) {
        return apiFetch<TeacherAssessmentDetail>(`/teacher/assessments/${row.id}/publish`, { method: 'POST' });
      }
      return row;
    },
    onSuccess: (row) => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['teacher-assessments'] });
      void queryClient.invalidateQueries({ queryKey: ['teacher-assessment', row.id] });
      toast.success(t('teacher.saved'));
      if (isNew) navigate(`/teacher/assessments/${row.id}`, { replace: true });
    },
    onError: (err: Error) => setError(err.message),
  });

  useEffect(() => {
    if (isNew || !existing.data) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void apiFetch(`/teacher/assessments/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload()),
      }).then(() => {
        void queryClient.invalidateQueries({ queryKey: ['teacher-assessment', id] });
      });
    }, 800);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, instructions, timeLimit, maxAttempts, passingScore, randomize]);

  const unpublish = useMutation({
    mutationFn: () => apiFetch(`/teacher/assessments/${id}/unpublish`, { method: 'POST' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['teacher-assessment', id] });
      toast.success(t('teacher.saved'));
    },
  });

  const addQuestion = useMutation({
    mutationFn: () =>
      apiFetch(`/teacher/assessments/${id}/questions`, {
        method: 'POST',
        body: JSON.stringify({ type: 'MULTIPLE_CHOICE', prompt: 'New question' }),
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['teacher-assessment', id] }),
  });

  usePageTrail([{ label: isNew ? t('teacher.newQuiz') : (existing.data?.title ?? t('nav.quizzes')) }]);

  if (classes.isLoading || (!isNew && existing.isLoading)) return <QueryLoading variant="assignment" />;
  if (classes.isError || !classes.data) return <QueryError onRetry={() => void classes.refetch()} />;
  if (!isNew && (existing.isError || !existing.data)) {
    return <QueryError onRetry={() => void existing.refetch()} />;
  }

  const quiz = existing.data;

  return (
    <div className="space-y-6">
      <PortalPageHeader title={isNew ? t('teacher.newQuiz') : (quiz?.title ?? '')} />
      {error ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{error}</Alert.Title>
          </Alert.Content>
        </Alert>
      ) : null}

      <PortalPanel>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="title" isRequired value={title} onChange={setTitle} className="sm:col-span-2">
          <Label>{t('teacher.title')}</Label>
          <Input />
        </TextField>
        <TextField name="instructions" value={instructions} onChange={setInstructions} className="sm:col-span-2">
          <Label>{t('teacher.instructions')}</Label>
          <TextArea />
        </TextField>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t('teacher.classSubject')}</span>
          <select
            className="rounded-lg border border-border bg-surface px-3 py-2"
            value={pair}
            disabled={!isNew}
            onChange={(event) => setPair(event.target.value)}
          >
            {classes.data.map((item) => (
              <option key={`${item.classId}:${item.subjectId}`} value={`${item.classId}:${item.subjectId}`}>
                {item.className} · {item.subjectName}
              </option>
            ))}
          </select>
        </label>
        <TextField name="timeLimit" value={timeLimit} onChange={setTimeLimit}>
          <Label>{t('teacher.timeLimit')}</Label>
          <Input type="number" min={1} />
        </TextField>
        <TextField name="maxAttempts" value={maxAttempts} onChange={setMaxAttempts}>
          <Label>{t('teacher.maxAttempts')}</Label>
          <Input type="number" min={1} />
        </TextField>
        <TextField name="passingScore" value={passingScore} onChange={setPassingScore}>
          <Label>{t('teacher.passingScore')}</Label>
          <Input type="number" min={0} max={100} />
        </TextField>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={randomize} onChange={(event) => setRandomize(event.target.checked)} />
          {t('teacher.randomize')}
        </label>
      </div>
      </PortalPanel>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onPress={() => save.mutate(false)} isPending={save.isPending}>
          {t('teacher.saveDraft')}
        </Button>
        <Button variant="primary" onPress={() => save.mutate(true)} isPending={save.isPending}>
          {t('teacher.publish')}
        </Button>
        {!isNew && quiz?.publishedAt ? (
          <Button variant="tertiary" onPress={() => unpublish.mutate()}>
            {t('teacher.unpublish')}
          </Button>
        ) : null}
        {!isNew ? (
          <Button variant="secondary" onPress={() => navigate(`/teacher/assessments/${id}/results`)}>
            {t('teacher.viewResults')}
          </Button>
        ) : null}
      </div>

      {!isNew && quiz ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t('teacher.addQuestion')}</h2>
            <Button size="sm" variant="secondary" onPress={() => addQuestion.mutate()}>
              {t('teacher.addQuestion')}
            </Button>
          </div>
          {quiz.questions.map((question) => (
            <QuestionEditor
              key={question.id}
              question={question}
              onChanged={() => void queryClient.invalidateQueries({ queryKey: ['teacher-assessment', id] })}
            />
          ))}
        </section>
      ) : null}
    </div>
  );
}

function QuestionEditor({
  question,
  onChanged,
}: {
  question: TeacherQuestion;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState(question.prompt);
  const [type, setType] = useState(question.type);
  const [points, setPoints] = useState(String(question.points));
  const [feedback, setFeedback] = useState(question.feedback ?? '');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setPrompt(question.prompt);
    setType(question.type);
    setPoints(String(question.points));
    setFeedback(question.feedback ?? '');
  }, [question]);

  const persist = (next: { prompt: string; type: QuestionType; points: string; feedback: string }) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void apiFetch(`/teacher/questions/${question.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          prompt: next.prompt,
          type: next.type,
          points: Number(next.points) || 1,
          feedback: next.feedback || null,
        }),
      }).then(onChanged);
    }, 600);
  };

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <TextField
          name={`prompt-${question.id}`}
          value={prompt}
          onChange={(value) => {
            setPrompt(value);
            persist({ prompt: value, type, points, feedback });
          }}
        >
          <Label>{t('teacher.prompt')}</Label>
          <Input />
        </TextField>
        <label className="flex flex-col gap-1 text-sm">
          <span>{t('teacher.lessonType')}</span>
          <select
            className="rounded-lg border border-border bg-surface px-3 py-2"
            value={type}
            onChange={(event) => {
              const next = event.target.value as QuestionType;
              setType(next);
              persist({ prompt, type: next, points, feedback });
            }}
          >
            {TYPES.map((item) => (
              <option key={item} value={item}>
                {t(`teacher.questionTypes.${item}`)}
              </option>
            ))}
          </select>
        </label>
        <TextField
          name={`points-${question.id}`}
          value={points}
          onChange={(value) => {
            setPoints(value);
            persist({ prompt, type, points: value, feedback });
          }}
        >
          <Label>{t('teacher.points')}</Label>
          <Input type="number" min={1} />
        </TextField>
      </div>
      <div className="space-y-2">
        {question.options.map((option) => (
          <OptionRow
            key={option.id}
            option={option}
            type={type}
            questionId={question.id}
            siblingIds={question.options.map((item) => item.id)}
            onChanged={onChanged}
          />
        ))}
        <Button
          size="sm"
          variant="tertiary"
          onPress={() =>
            void apiFetch(`/teacher/questions/${question.id}/options`, {
              method: 'POST',
              body: JSON.stringify({
                text: type === 'SHORT_ANSWER' ? 'accepted' : 'Option',
                isCorrect: type === 'SHORT_ANSWER',
              }),
            }).then(onChanged)
          }
        >
          {type === 'SHORT_ANSWER' ? t('teacher.addAccepted') : t('teacher.addOption')}
        </Button>
      </div>
      <TextField
        name={`feedback-${question.id}`}
        value={feedback}
        onChange={(value) => {
          setFeedback(value);
          persist({ prompt, type, points, feedback: value });
        }}
      >
        <Label>{t('teacher.feedback')}</Label>
        <TextArea />
      </TextField>
      <Button
        size="sm"
        variant="danger"
        onPress={() => void apiFetch(`/teacher/questions/${question.id}`, { method: 'DELETE' }).then(onChanged)}
      >
        {t('teacher.delete')}
      </Button>
    </div>
  );
}

function OptionRow({
  option,
  type,
  questionId,
  siblingIds,
  onChanged,
}: {
  option: TeacherQuestionOption;
  type: QuestionType;
  questionId: string;
  siblingIds: string[];
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const [text, setText] = useState(option.text);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setText(option.text);
  }, [option.id]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const persistText = (value: string, immediate = false) => {
    setText(value);
    if (timer.current) clearTimeout(timer.current);
    const write = () =>
      apiFetch(`/teacher/options/${option.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ text: value }),
      });
    if (immediate) {
      void write();
      return;
    }
    timer.current = setTimeout(() => {
      void write();
    }, 400);
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type={type === 'MULTIPLE_ANSWER' || type === 'SHORT_ANSWER' ? 'checkbox' : 'radio'}
        name={`correct-${questionId}`}
        checked={option.isCorrect}
        onChange={(event) => {
          const exclusive = type === 'MULTIPLE_CHOICE' || type === 'TRUE_FALSE';
          const checked = event.target.checked;
          const updates =
            exclusive && checked
              ? Promise.all(
                  siblingIds.map((id) =>
                    apiFetch(`/teacher/options/${id}`, {
                      method: 'PATCH',
                      body: JSON.stringify({ isCorrect: id === option.id }),
                    }),
                  ),
                )
              : apiFetch(`/teacher/options/${option.id}`, {
                  method: 'PATCH',
                  body: JSON.stringify({ isCorrect: checked }),
                });
          void updates.then(onChanged);
        }}
      />
      <TextField name={`option-${option.id}`} value={text} onChange={persistText} className="min-w-0 flex-1">
        <Label className="sr-only">{t('teacher.addOption')}</Label>
        <Input onBlur={() => persistText(text, true)} />
      </TextField>
      <Button
        size="sm"
        variant="danger"
        onPress={() => void apiFetch(`/teacher/options/${option.id}`, { method: 'DELETE' }).then(onChanged)}
      >
        {t('teacher.delete')}
      </Button>
    </div>
  );
}
