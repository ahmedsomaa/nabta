import { useQuery } from '@tanstack/react-query';
import { useRef, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Card, Chip } from '@heroui/react';
import { BookOpen } from 'lucide-react';
import type {
  StudentDashboard,
  StudentGradeListItem,
  StudentMe,
  StudentSubjectListItem,
  TimetableSlotView,
  UpcomingAssignment,
} from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { EmptyCard, QueryError, QueryLoading } from './QueryState';
import { dueUrgency, formatDue, QuizStatusChip, StatusChip } from './StatusChip';
import { IconWell, StudentProgress } from './StudentChrome';
import { PlayIcon, type PlayIconHandle } from '@/components/icons/play';
import { cn } from '@/lib/cn';

const HOME_UPCOMING_LIMIT = 4;
const ACTIONABLE_ASSIGNMENT = new Set(['NOT_STARTED', 'DRAFT', 'LATE', 'RETURNED']);
const ACTIONABLE_QUIZ = new Set(['NOT_STARTED', 'IN_PROGRESS']);

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

function minutesFromClock(clock: string) {
  const [hours, minutes] = clock.split(':').map(Number);
  if (hours == null || minutes == null || !Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
}

function isActionable(item: UpcomingAssignment) {
  if (item.kind === 'assessment') return ACTIONABLE_QUIZ.has(item.status);
  return ACTIONABLE_ASSIGNMENT.has(item.status);
}

function isCurrentSlot(slot: TimetableSlotView, now = new Date()) {
  const start = minutesFromClock(slot.startsAt);
  const end = minutesFromClock(slot.endsAt);
  if (start == null || end == null) return false;
  const current = now.getHours() * 60 + now.getMinutes();
  return current >= start && current < end;
}

function StatusDot() {
  return (
    <span className="text-border" aria-hidden>
      ·
    </span>
  );
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

function DueRow({ item, dueLabel }: { item: UpcomingAssignment; dueLabel: string }) {
  const isQuiz = item.kind === 'assessment';
  const urgency = dueUrgency(item.dueAt, item.status);
  return (
    <Link
      to={workHref(item)}
      className="flex w-full items-start gap-3 px-3 py-2.5 text-start text-inherit no-underline hover:bg-overlay focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{item.title}</p>
        <p className={cn('mt-0.5 truncate text-xs text-muted', urgency === 'overdue' && 'text-danger')}>
          {item.dueAt ? `${item.subjectName} · ${dueLabel}` : item.subjectName}
        </p>
      </div>
      {isQuiz ? (
        <QuizStatusChip status={item.status as 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED'} />
      ) : (
        <StatusChip status={item.status} />
      )}
    </Link>
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
  const grades = useQuery({
    queryKey: ['student-grades'],
    queryFn: () => apiFetch<StudentGradeListItem[]>('/me/grades'),
  });
  const subjects = useQuery({
    queryKey: ['student-subjects'],
    queryFn: () => apiFetch<StudentSubjectListItem[]>('/me/subjects'),
  });

  if (me.isLoading || dash.isLoading || subjects.isLoading) return <QueryLoading variant="dashboard" />;
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
  const overdueCount = data.upcoming.filter(
    (item) => dueUrgency(item.dueAt, item.status) === 'overdue',
  ).length;
  const scored = (grades.data ?? []).filter((row) => row.percentage != null);
  const average =
    scored.length > 0
      ? Math.round(scored.reduce((sum, row) => sum + (row.percentage ?? 0), 0) / scored.length)
      : null;
  const continueSubject = subjects.data?.find(
    (subject) => subject.id === data.continueLearning?.subjectId,
  );
  const dueItems = data.upcoming.filter(isActionable).slice(0, HOME_UPCOMING_LIMIT);
  const seeAllTo = dueItems.some((item) => item.kind === 'assessment') &&
    !dueItems.some((item) => item.kind !== 'assessment')
    ? '/student/quizzes'
    : '/student/assignments';
  const continueHref = data.continueLearning
    ? `/student/classes/${data.continueLearning.subjectId}/lessons/${data.continueLearning.lessonId}`
    : null;

  const statusParts: ReactNode[] = [];
  if (data.overview.total > 0) {
    statusParts.push(
      <Link
        key="submitted"
        to="/student/assignments"
        className="text-muted no-underline hover:text-accent"
      >
        {t('student.homeSubmitted', data.overview)}
      </Link>,
    );
  }
  if (overdueCount > 0) {
    statusParts.push(
      <Link key="overdue" to="/student/assignments" className="text-danger no-underline hover:opacity-80">
        {t('student.homeOverdue', { count: overdueCount })}
      </Link>,
    );
  }
  if (average != null) {
    statusParts.push(
      <Link key="average" to="/student/grades" className="text-muted no-underline hover:text-accent">
        {t('student.homeAverage', { percent: average })}
      </Link>,
    );
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {t(greetingKey(hour), { name: me.data.givenName })}
        </h1>
        {statusParts.length > 0 ? (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            {statusParts.map((part, index) => (
              <span key={index} className="contents">
                {index > 0 ? <StatusDot /> : null}
                {part}
              </span>
            ))}
          </p>
        ) : null}
      </header>

      {data.continueLearning && continueHref ? (
        <Card className="border-accent/20 bg-accent/10 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <IconWell icon={BookOpen} />
              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <p className="text-xs font-medium text-accent">{t('student.continueLearning')}</p>
                  <Card.Title className="mt-0.5">{data.continueLearning.lessonTitle}</Card.Title>
                  <Card.Description>{data.continueLearning.subjectName}</Card.Description>
                </div>
                {continueSubject ? (
                  <div className="flex max-w-sm items-center gap-3">
                    <StudentProgress
                      value={continueSubject.progressPercent}
                      label={t('student.progress', { percent: continueSubject.progressPercent })}
                    />
                    <span className="shrink-0 text-xs text-muted tabular-nums">
                      {t('student.progress', { percent: continueSubject.progressPercent })}
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
              {t('student.openLesson')}
            </Button>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="order-2 min-w-0 space-y-3 lg:order-1">
          <SectionHeading title={t('student.todaySchedule')} />
          {data.schedule.length === 0 ? (
            <EmptyCard>{t('student.emptySchedule')}</EmptyCard>
          ) : (
            <ul className="overflow-hidden rounded-xl border border-border">
              {data.schedule.map((slot) => {
                const current = isCurrentSlot(slot);
                return (
                  <li key={slot.id} className="border-b border-border last:border-b-0">
                    <Link
                      to={`/student/classes/${slot.subjectId}`}
                      className={cn(
                        'flex w-full items-center gap-3 px-3 py-3 text-start text-inherit no-underline hover:bg-overlay focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent',
                        current && 'bg-accent/5',
                      )}
                    >
                      <span dir="ltr" className="w-[7.5rem] shrink-0 text-sm font-medium tabular-nums">
                        {slot.startsAt}–{slot.endsAt}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{slot.subjectName}</span>
                      {current ? (
                        <Chip size="sm" color="accent" variant="soft">
                          {t('student.happeningNow')}
                        </Chip>
                      ) : null}
                      {slot.room ? (
                        <span className="shrink-0 text-xs text-muted">
                          {t('student.room', { room: slot.room })}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="order-1 min-w-0 space-y-3 lg:order-2">
          <SectionHeading
            title={t('student.upcoming')}
            to={dueItems.length > 0 || data.upcoming.length > 0 ? seeAllTo : undefined}
            actionLabel={t('student.seeAll')}
          />
          {dueItems.length === 0 ? (
            <EmptyCard>{t('student.emptyUpcoming')}</EmptyCard>
          ) : (
            <ul className="overflow-hidden rounded-xl border border-border">
              {dueItems.map((item) => (
                <li
                  key={`${item.kind ?? 'assignment'}-${item.id}`}
                  className="border-b border-border last:border-b-0"
                >
                  <DueRow
                    item={item}
                    dueLabel={t('student.due', { date: formatDue(item.dueAt, i18n.language) })}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
