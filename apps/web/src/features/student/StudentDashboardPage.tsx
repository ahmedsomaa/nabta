import { useQuery } from '@tanstack/react-query';
import { useRef, type MouseEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Card } from '@heroui/react';
import { BookOpen, ClipboardList, FileQuestion, TrendingUp } from 'lucide-react';
import type {
  StudentAssessmentListItem,
  StudentDashboard,
  StudentMe,
  StudentSubjectListItem,
  UpcomingAssignment,
} from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { EmptyCard, QueryError, QueryLoading } from './QueryState';
import { dueUrgency, formatDue, QuizStatusChip, StatusChip } from './StatusChip';
import { IconWell, StudentMetric, StudentProgress } from './StudentChrome';
import { PlayIcon, type PlayIconHandle } from '@/components/icons/play';
import { cn } from '@/lib/cn';
import { ACTIONABLE_ASSIGNMENT, ACTIONABLE_QUIZ, isSameCalendarDay } from './studentWork';

const UPCOMING_LIMIT = 7;
const RECENT_GRADES_LIMIT = 5;

function greetingKey(hour: number) {
  if (hour < 12) return 'student.greetingMorning';
  if (hour < 17) return 'student.greetingAfternoon';
  return 'student.greetingEvening';
}

function workHref(item: UpcomingAssignment) {
  return item.kind === 'assessment'
    ? `/student/assessments/${item.id}`
    : `/student/assignments/${item.id}`;
}

function isActionable(item: UpcomingAssignment) {
  if (item.kind === 'assessment') return ACTIONABLE_QUIZ.has(item.status);
  return ACTIONABLE_ASSIGNMENT.has(item.status);
}

function isTodayTask(item: UpcomingAssignment) {
  if (!isActionable(item)) return false;
  if (item.kind === 'assessment' && item.status === 'IN_PROGRESS') return true;
  const urgency = dueUrgency(item.dueAt, item.status);
  return urgency === 'overdue' || isSameCalendarDay(item.dueAt);
}

function formatShortDate(iso: string | null, locale: string) {
  if (!iso) return '';
  return new Intl.DateTimeFormat(locale.startsWith('ar') ? 'ar' : 'en', {
    day: '2-digit',
    month: 'short',
  }).format(new Date(iso));
}

function SectionHeading({
  title,
  to,
  actionLabel,
}: {
  title: string;
  to?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {to && actionLabel ? (
        <Link to={to} className="text-sm text-muted no-underline hover:text-accent">
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

function taskActionKey(item: UpcomingAssignment) {
  if (item.kind === 'assessment') {
    return item.status === 'IN_PROGRESS' ? 'assessment.resume' : 'assessment.start';
  }
  return 'student.viewAssignment';
}

function asWorkItem(item: UpcomingAssignment | StudentAssessmentListItem, kind: UpcomingAssignment['kind']) {
  if ('kind' in item && item.kind) {
    return item;
  }
  if (kind === 'assessment') {
    const quiz = item as StudentAssessmentListItem;
    return {
      id: quiz.id,
      kind: 'assessment' as const,
      title: quiz.title,
      dueAt: null,
      subjectName: quiz.subjectName,
      status: quiz.status,
    };
  }
  return { ...(item as UpcomingAssignment), kind: 'assignment' as const };
}

function TodayTaskRow({
  item,
  dueLabel,
  kindLabel,
  actionLabel,
}: {
  item: UpcomingAssignment;
  dueLabel: string;
  kindLabel: string;
  actionLabel: string;
}) {
  const navigate = useNavigate();
  const urgency = dueUrgency(item.dueAt, item.status);
  const href = workHref(item);
  const open = (event?: MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    navigate(href);
  };

  return (
    <div className="flex items-start gap-3 px-3 py-2.5">
      <Link
        to={href}
        className="min-w-0 flex-1 text-start text-inherit no-underline hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <p className="truncate font-medium text-accent">{item.title}</p>
        <p className={cn('mt-0.5 truncate text-xs text-muted', urgency === 'overdue' && 'text-danger')}>
          {[kindLabel, item.subjectName, item.dueAt ? dueLabel : null].filter(Boolean).join(' · ')}
        </p>
      </Link>
      {item.kind === 'assessment' ? (
        <QuizStatusChip status={item.status as 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED'} />
      ) : (
        <StatusChip status={item.status} />
      )}
      <Button size="sm" variant="primary" className="shrink-0" onPress={() => open()}>
        {actionLabel}
      </Button>
    </div>
  );
}

export function StudentDashboardPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const playRef = useRef<PlayIconHandle>(null);
  const me = useQuery({ queryKey: ['student-me'], queryFn: () => apiFetch<StudentMe>('/me') });
  const dash = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: () => apiFetch<StudentDashboard>('/me/dashboard'),
  });
  const subjects = useQuery({
    queryKey: ['student-subjects'],
    queryFn: () => apiFetch<StudentSubjectListItem[]>('/me/subjects'),
  });
  const assignments = useQuery({
    queryKey: ['student-assignments'],
    queryFn: () => apiFetch<UpcomingAssignment[]>('/me/assignments'),
  });
  const assessments = useQuery({
    queryKey: ['student-assessments'],
    queryFn: () => apiFetch<StudentAssessmentListItem[]>('/me/assessments'),
  });

  if (me.isLoading || dash.isLoading || subjects.isLoading || assignments.isLoading || assessments.isLoading) {
    return <QueryLoading variant="dashboard" />;
  }
  if (me.isError || dash.isError || !me.data || !dash.data) {
    return (
      <QueryError
        onRetry={() => {
          void me.refetch();
          void dash.refetch();
        }}
      />
    );
  }

  const hour = new Date().getHours();
  const data = dash.data;
  const subjectList = subjects.data ?? [];
  const assignmentList = (assignments.data ?? []).map((item) => asWorkItem(item, 'assignment'));
  const quizList = (assessments.data ?? []).map((item) => asWorkItem(item, 'assessment'));
  const queue = [...assignmentList, ...quizList];
  const taskCount = assignmentList.filter((item) => ACTIONABLE_ASSIGNMENT.has(item.status)).length;
  const quizCount = quizList.filter((item) => ACTIONABLE_QUIZ.has(item.status)).length;
  const progressMean =
    subjectList.length === 0
      ? null
      : Math.round(subjectList.reduce((sum, row) => sum + row.progressPercent, 0) / subjectList.length);

  const todayTasks = queue
    .filter(isTodayTask)
    .sort((a, b) => {
      const aOverdue = dueUrgency(a.dueAt, a.status) === 'overdue' ? 0 : 1;
      const bOverdue = dueUrgency(b.dueAt, b.status) === 'overdue' ? 0 : 1;
      if (aOverdue !== bOverdue) return aOverdue - bOverdue;
      return (a.dueAt ?? '').localeCompare(b.dueAt ?? '');
    });
  const todayKeys = new Set(todayTasks.map((item) => `${item.kind}-${item.id}`));
  const upcoming = queue
    .filter((item) => isActionable(item) && !todayKeys.has(`${item.kind}-${item.id}`))
    .sort((a, b) => (a.dueAt ?? '9999').localeCompare(b.dueAt ?? '9999'))
    .slice(0, UPCOMING_LIMIT);

  const recentGrades = [
    ...assignmentList
      .filter((item) => item.status === 'GRADED')
      .map((item) => ({
        key: `assignment-${item.id}`,
        href: `/student/assignments/${item.id}`,
        title: item.title,
        subjectName: item.subjectName,
        scoreLabel: t('student.statusGraded'),
      })),
    ...(assessments.data ?? [])
      .filter((item) => item.bestScore != null)
      .map((item) => ({
        key: `assessment-${item.id}`,
        href: `/student/assessments/${item.id}`,
        title: item.title,
        subjectName: item.subjectName,
        scoreLabel: `${item.bestScore} / ${item.maxScore}`,
      })),
  ].slice(0, RECENT_GRADES_LIMIT);

  const continueSubject = subjectList.find((subject) => subject.id === data.continueLearning?.subjectId);
  const continueHref = data.continueLearning
    ? `/student/classes/${data.continueLearning.subjectId}/lessons/${data.continueLearning.lessonId}`
    : null;
  const seeAllTo = upcoming.some((item) => item.kind === 'assessment') &&
    !upcoming.some((item) => item.kind !== 'assessment')
    ? '/student/quizzes'
    : '/student/assignments';

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t(greetingKey(hour), { name: me.data.givenName })}
        </h1>
        <p className="text-sm text-muted">{t('student.homeSubtitle')}</p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StudentMetric
          label={t('student.statSubjects')}
          value={String(subjectList.length)}
          icon={BookOpen}
          onPress={() => navigate('/student/classes')}
        />
        <StudentMetric
          label={t('student.statTasks')}
          value={String(taskCount)}
          icon={ClipboardList}
          tone={taskCount > 0 ? 'accent' : 'success'}
          onPress={() => navigate('/student/assignments')}
        />
        <StudentMetric
          label={t('student.statQuizzes')}
          value={String(quizCount)}
          icon={FileQuestion}
          tone={quizCount > 0 ? 'accent' : 'success'}
          onPress={() => navigate('/student/quizzes')}
        />
        <StudentMetric
          label={t('student.statProgress')}
          value={progressMean == null ? t('grades.noScore') : `${progressMean}%`}
          icon={TrendingUp}
          onPress={() => navigate('/student/grades')}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="min-w-0 space-y-3">
          <SectionHeading title={t('student.todayTasks')} />
          {todayTasks.length === 0 ? (
            <EmptyCard>{t('student.emptyTodayTasks')}</EmptyCard>
          ) : (
            <ul className="overflow-hidden rounded-xl border border-border bg-surface">
              {todayTasks.map((item) => (
                <li key={`${item.kind}-${item.id}`} className="border-b border-border last:border-b-0">
                  <TodayTaskRow
                    item={item}
                    kindLabel={item.kind === 'assessment' ? t('nav.quizzes') : t('nav.assignments')}
                    dueLabel={t('student.due', { date: formatDue(item.dueAt, i18n.language) })}
                    actionLabel={t(taskActionKey(item))}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="min-w-0 space-y-3">
          <SectionHeading
            title={t('student.upcoming')}
            to={upcoming.length > 0 || todayTasks.length > 0 ? seeAllTo : undefined}
            actionLabel={t('student.seeAll')}
          />
          {upcoming.length === 0 ? (
            <EmptyCard>{t('student.emptyUpcoming')}</EmptyCard>
          ) : (
            <ul className="overflow-hidden rounded-xl border border-border bg-surface">
              {upcoming.map((item) => {
                const dateLabel = formatShortDate(item.dueAt, i18n.language);
                return (
                  <li key={`${item.kind}-${item.id}`} className="border-b border-border last:border-b-0">
                    <Link
                      to={workHref(item)}
                      className="flex w-full items-start gap-3 px-3 py-2.5 text-start text-inherit no-underline hover:bg-overlay focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">
                          {dateLabel ? `${dateLabel} · ${item.title}` : item.title}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted">{item.subjectName}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {data.continueLearning && continueHref ? (
        <Card className="bg-surface p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <IconWell icon={BookOpen} />
              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <p className="text-xs font-medium text-accent">{t('student.continueLearning')}</p>
                  <Card.Title className="mt-0.5">{data.continueLearning.subjectName}</Card.Title>
                  <Card.Description>{data.continueLearning.lessonTitle}</Card.Description>
                </div>
                {continueSubject ? (
                  <div className="flex max-w-sm items-center gap-3">
                    <StudentProgress
                      value={continueSubject.progressPercent}
                      label={t('student.progress', { percent: continueSubject.progressPercent })}
                    />
                    <span className="shrink-0 text-xs text-muted tabular-nums">
                      {t('student.progressShort', { percent: continueSubject.progressPercent })}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
            <Button
              className="shrink-0"
              variant="primary"
              onHoverStart={() => void playRef.current?.startAnimation()}
              onHoverEnd={() => void playRef.current?.stopAnimation()}
              onPress={() => navigate(continueHref)}
            >
              <PlayIcon
                ref={playRef}
                className="inline-flex size-4 shrink-0 items-center justify-center"
                size={16}
              />
              {t('student.continue')}
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="min-w-0 space-y-3">
          <SectionHeading title={t('student.recentGrades')} to="/student/grades" actionLabel={t('student.seeAll')} />
          {recentGrades.length === 0 ? (
            <EmptyCard>{t('student.emptyRecentGrades')}</EmptyCard>
          ) : (
            <ul className="overflow-hidden rounded-xl border border-border bg-surface">
              {recentGrades.map((item) => (
                <li key={item.key} className="border-b border-border last:border-b-0">
                  <Link
                    to={item.href}
                    className="flex w-full items-start justify-between gap-3 px-3 py-2.5 text-start text-inherit no-underline hover:bg-overlay focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.title}</p>
                      <p className="mt-0.5 truncate text-xs text-muted">{item.subjectName}</p>
                    </div>
                    <p className="shrink-0 text-sm tabular-nums text-muted" dir="ltr">
                      {item.scoreLabel}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="min-w-0 space-y-3">
          <SectionHeading title={t('student.announcements')} />
          <EmptyCard>{t('student.announcementsLater')}</EmptyCard>
        </section>
      </div>
    </div>
  );
}
