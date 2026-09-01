import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button, Chip } from '@heroui/react';
import { Check, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import type { LessonType, StudentLessonDetail, StudentSubjectListItem, StudentUnit } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from './QueryState';
import { LESSON_TYPE_ICON, lessonTypeKey } from './lessonType';
import { cn } from '@/lib/cn';
import { usePageTrail } from '@/layouts/PageTrail';

function youtubeId(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) return parsed.pathname.slice(1);
    return parsed.searchParams.get('v');
  } catch {
    return null;
  }
}

function LessonBody({ type, body, url, title }: { type: LessonType; body: string | null; url: string | null; title: string }) {
  const { t } = useTranslation();

  if (type === 'RICH_TEXT') {
    return <p className="whitespace-pre-wrap leading-relaxed text-foreground">{body}</p>;
  }

  if (type === 'IMAGE' && url) {
    return <img src={url} alt={title} className="max-h-[70vh] w-full rounded-xl object-contain" />;
  }

  if (type === 'PDF' && url) {
    return (
      <iframe
        title={title}
        src={url}
        className="h-[70vh] w-full rounded-xl border border-border bg-surface"
      />
    );
  }

  if (type === 'VIDEO' && url) {
    const id = youtubeId(url);
    if (id) {
      return (
        <iframe
          title={title}
          src={`https://www.youtube.com/embed/${id}`}
          className="aspect-video w-full rounded-xl border border-border"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }
    return <video src={url} controls className="w-full rounded-xl" />;
  }

  if (url) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed border-border bg-surface px-5 py-6">
        <p className="text-sm text-muted">{title}</p>
        <Button
          variant="primary"
          onPress={() => window.open(url, '_blank', 'noopener,noreferrer')}
        >
          <ExternalLink className="size-4" aria-hidden />
          {t('student.externalLink')}
        </Button>
      </div>
    );
  }

  return null;
}

function UnitSidebar({
  units,
  subjectId,
  currentId,
}: {
  units: StudentUnit[];
  subjectId: string;
  currentId: string;
}) {
  const { t } = useTranslation();
  return (
    <aside className="rounded-xl border border-border bg-surface p-4 lg:sticky lg:top-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">{t('student.units')}</p>
      <nav className="space-y-4">
        {units.map((unit) => (
          <div key={unit.id}>
            <p className="mb-1.5 px-1 text-sm font-semibold">{unit.title}</p>
            <ul className="space-y-0.5">
              {unit.lessons.map((lesson) => {
                const on = lesson.id === currentId;
                const TypeIcon = LESSON_TYPE_ICON[lesson.type];
                return (
                  <li key={lesson.id}>
                    <Link
                      to={`/student/classes/${subjectId}/lessons/${lesson.id}`}
                      className={cn(
                        'flex items-start gap-2 rounded-lg px-2 py-2 text-sm no-underline',
                        on
                          ? 'bg-accent/10 font-medium text-accent'
                          : 'text-foreground hover:bg-overlay',
                      )}
                    >
                      <TypeIcon className="mt-0.5 size-3.5 shrink-0 opacity-80" aria-hidden />
                      <span className="min-w-0 flex-1 leading-snug [overflow-wrap:anywhere]">
                        {lesson.title}
                      </span>
                      {lesson.completed ? (
                        <Check className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden />
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

export function StudentLessonPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { subjectId = '', lessonId = '' } = useParams();
  const query = useQuery({
    queryKey: ['student-lesson', lessonId],
    queryFn: () => apiFetch<StudentLessonDetail>(`/me/lessons/${lessonId}`),
    enabled: Boolean(lessonId),
  });
  const subjects = useQuery({
    queryKey: ['student-subjects'],
    queryFn: () => apiFetch<StudentSubjectListItem[]>('/me/subjects'),
  });
  const subjectName = subjects.data?.find((item) => item.id === subjectId)?.name;
  usePageTrail(
    query.data
      ? [
          {
            label: subjectName ?? t('nav.myClasses'),
            to: `/student/classes/${subjectId}`,
          },
          { label: query.data.title },
        ]
      : [],
  );

  const progress = useMutation({
    mutationFn: (completed: boolean) =>
      apiFetch<{ lessonId: string; completed: boolean }>(`/me/lessons/${lessonId}/progress`, {
        method: 'POST',
        body: JSON.stringify({ completed }),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['student-lesson', lessonId] }),
        queryClient.invalidateQueries({ queryKey: ['student-subject', subjectId] }),
        queryClient.invalidateQueries({ queryKey: ['student-subjects'] }),
        queryClient.invalidateQueries({ queryKey: ['student-dashboard'] }),
      ]);
    },
  });

  if (query.isLoading) return <QueryLoading />;
  if (query.isError || !query.data) return <QueryError onRetry={() => void query.refetch()} />;

  const lesson = query.data;
  const TypeIcon = LESSON_TYPE_ICON[lesson.type];
  const flat = lesson.units.flatMap((unit) => unit.lessons);
  const index = flat.findIndex((item) => item.id === lesson.id);
  const previous = index > 0 ? flat[index - 1] : undefined;
  const next = index >= 0 && index < flat.length - 1 ? flat[index + 1] : undefined;

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
      <div className="order-2 w-full lg:order-1 lg:w-80 lg:shrink-0">
        <UnitSidebar units={lesson.units} subjectId={lesson.subjectId} currentId={lesson.id} />
      </div>
      <div className="order-1 min-w-0 flex-1 space-y-4 lg:order-2 lg:max-w-3xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-3">
            <h1 className="min-w-0 text-2xl font-semibold tracking-tight [overflow-wrap:anywhere]">{lesson.title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Chip size="sm" variant="soft">
                <TypeIcon className="size-3" aria-hidden />
                {t(lessonTypeKey(lesson.type))}
              </Chip>
              {lesson.completed ? (
                <Chip size="sm" color="success" variant="soft">
                  <Check className="size-3" aria-hidden />
                  {t('student.completed')}
                </Chip>
              ) : null}
            </div>
          </div>
          <Button
            size="sm"
            className="shrink-0"
            variant={lesson.completed ? 'secondary' : 'primary'}
            isPending={progress.isPending}
            onPress={() => progress.mutate(!lesson.completed)}
          >
            {lesson.completed ? t('student.markIncomplete') : t('student.markComplete')}
          </Button>
        </div>
        {progress.isError ? <QueryError onRetry={() => progress.mutate(!lesson.completed)} /> : null}
        <LessonBody type={lesson.type} body={lesson.body} url={lesson.url} title={lesson.title} />
        <div className="flex flex-wrap justify-between gap-2 border-t border-border pt-4">
          {previous ? (
            <Button
              size="sm"
              variant="secondary"
              onPress={() =>
                navigate(`/student/classes/${lesson.subjectId}/lessons/${previous.id}`)
              }
            >
              <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden />
              {t('student.prevLesson')}
            </Button>
          ) : (
            <span />
          )}
          {next ? (
            <Button
              size="sm"
              variant="secondary"
              onPress={() => navigate(`/student/classes/${lesson.subjectId}/lessons/${next.id}`)}
            >
              {t('student.nextLesson')}
              <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
