import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button, Chip } from '@heroui/react';
import { Check } from 'lucide-react';
import type { LessonType, StudentLessonDetail, StudentUnit } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from './QueryState';

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
      <a href={url} target="_blank" rel="noreferrer" className="font-medium text-accent">
        {t('student.externalLink')}
      </a>
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
    <aside className="lg:w-64 lg:shrink-0">
      <p className="mb-2 text-xs font-medium text-muted">{t('student.units')}</p>
      <nav className="space-y-4">
        {units.map((unit) => (
          <div key={unit.id}>
            <p className="mb-1 text-sm font-semibold">{unit.title}</p>
            <ul className="space-y-1">
              {unit.lessons.map((lesson) => {
                const on = lesson.id === currentId;
                return (
                  <li key={lesson.id}>
                    <Link
                      to={`/student/classes/${subjectId}/lessons/${lesson.id}`}
                      className={`flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm no-underline ${
                        on ? 'bg-accent/10 font-medium text-accent' : 'text-foreground hover:bg-overlay'
                      }`}
                    >
                      <span>{lesson.title}</span>
                      {lesson.completed ? <Check className="size-3.5 shrink-0 text-accent" aria-hidden /> : null}
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
  const queryClient = useQueryClient();
  const { subjectId = '', lessonId = '' } = useParams();
  const query = useQuery({
    queryKey: ['student-lesson', lessonId],
    queryFn: () => apiFetch<StudentLessonDetail>(`/me/lessons/${lessonId}`),
    enabled: Boolean(lessonId),
  });

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

  return (
    <div className="space-y-4">
      <Link
        to={`/student/classes/${lesson.subjectId}`}
        className="text-sm text-muted no-underline hover:text-accent"
      >
        {t('student.backToClasses')}
      </Link>

      <div className="flex flex-col gap-6 lg:flex-row">
        <UnitSidebar units={lesson.units} subjectId={lesson.subjectId} currentId={lesson.id} />
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{lesson.title}</h1>
              {lesson.completed ? (
                <Chip size="sm" color="success" variant="soft" className="mt-2">
                  {t('student.completed')}
                </Chip>
              ) : null}
            </div>
            <Button
              size="sm"
              variant={lesson.completed ? 'secondary' : 'primary'}
              isPending={progress.isPending}
              onPress={() => progress.mutate(!lesson.completed)}
            >
              {lesson.completed ? t('student.markIncomplete') : t('student.markComplete')}
            </Button>
          </div>
          {progress.isError ? <QueryError onRetry={() => progress.mutate(!lesson.completed)} /> : null}
          <LessonBody type={lesson.type} body={lesson.body} url={lesson.url} title={lesson.title} />
        </div>
      </div>
    </div>
  );
}
