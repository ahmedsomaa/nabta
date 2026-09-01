import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, Chip } from '@heroui/react';
import type {
  StudentAssessmentListItem,
  StudentSubjectDetail,
  StudentUnit,
  TimetableSlotView,
  UpcomingAssignment,
} from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { EmptyCard, QueryError, QueryLoading } from './QueryState';
import { dueUrgency, formatDue, QuizStatusChip, StatusChip } from './StatusChip';
import { StudentPageHeader, StudentProgress } from './StudentChrome';
import { usePageTrail } from '@/layouts/PageTrail';
import { lessonTypeKey } from './lessonType';
import { cn } from '@/lib/cn';

function consecutiveDays(days: number[]) {
  const sorted = [...days].sort((a, b) => a - b);
  return sorted.every((day, index) => index === 0 || day === sorted[index - 1]! + 1);
}

function formatDaySpan(days: number[], weekdayLabel: (day: number) => string, everyDay: string) {
  const unique = [...new Set(days)].sort((a, b) => a - b);
  if (unique.length === 7) return everyDay;
  if (unique.length >= 2 && consecutiveDays(unique)) {
    return `${weekdayLabel(unique[0]!)}–${weekdayLabel(unique[unique.length - 1]!)}`;
  }
  return unique.map(weekdayLabel).join(', ');
}

function scheduleGroups(
  slots: TimetableSlotView[],
  weekdayLabel: (day: number) => string,
  everyDay: string,
  roomLabel: (room: string) => string,
) {
  const groups = new Map<string, { startsAt: string; endsAt: string; room: string | null; days: number[] }>();
  for (const slot of slots) {
    const key = `${slot.startsAt}|${slot.endsAt}|${slot.room ?? ''}`;
    const existing = groups.get(key);
    if (existing) {
      existing.days.push(slot.weekday);
    } else {
      groups.set(key, {
        startsAt: slot.startsAt,
        endsAt: slot.endsAt,
        room: slot.room,
        days: [slot.weekday],
      });
    }
  }
  return [...groups.values()].map((group) => ({
    days: formatDaySpan(group.days, weekdayLabel, everyDay),
    time: `${group.startsAt}–${group.endsAt}`,
    room: group.room ? roomLabel(group.room) : null,
  }));
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm">{children}</dd>
    </div>
  );
}

function nextIncomplete(units: StudentUnit[]) {
  for (const unit of units) {
    const lesson = unit.lessons.find((item) => !item.completed);
    if (lesson) return { unit, lesson };
  }
  return null;
}

function ListRow({
  href,
  title,
  subtitle,
  trailing,
  highlight,
  danger,
}: {
  href: string;
  title: string;
  subtitle: string;
  trailing?: ReactNode;
  highlight?: boolean;
  danger?: boolean;
}) {
  return (
    <Link
      to={href}
      className={cn(
        'flex w-full items-start gap-3 px-3 py-2.5 text-start text-inherit no-underline hover:bg-overlay focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent',
        highlight && 'bg-accent/5',
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{title}</p>
        <p className={cn('mt-0.5 truncate text-xs text-muted', danger && 'text-danger')}>{subtitle}</p>
      </div>
      {trailing}
    </Link>
  );
}

export function StudentSubjectPage() {
  const { t, i18n } = useTranslation();
  const { subjectId = '' } = useParams();
  const query = useQuery({
    queryKey: ['student-subject', subjectId],
    queryFn: () => apiFetch<StudentSubjectDetail>(`/me/subjects/${subjectId}`),
    enabled: Boolean(subjectId),
  });
  usePageTrail(query.data ? [{ label: query.data.name }] : []);

  if (query.isLoading) return <QueryLoading variant="subject" />;
  if (query.isError || !query.data) return <QueryError onRetry={() => void query.refetch()} />;

  const subject = query.data;
  const lessons = subject.units.flatMap((unit) => unit.lessons);
  const doneCount = lessons.filter((lesson) => lesson.completed).length;
  const next = nextIncomplete(subject.units);
  const currentUnitId = next?.unit.id ?? null;
  const groups = scheduleGroups(
    subject.schedule ?? [],
    (day) => t(`student.weekdayShort.${day}`),
    t('student.everyDay'),
    (room) => t('student.room', { room }),
  );

  const assignmentRows = subject.assignments.map((item: UpcomingAssignment) => ({
    id: item.id,
    kind: 'assignment' as const,
    title: item.title,
    subtitle: t('student.due', { date: formatDue(item.dueAt, i18n.language) }),
    status: item.status,
    href: `/student/assignments/${item.id}`,
    dueAt: item.dueAt,
  }));
  const quizRows = subject.assessments.map((item: StudentAssessmentListItem) => ({
    id: item.id,
    kind: 'assessment' as const,
    title: item.title,
    subtitle: [
      t('assessment.attempts', { used: item.attemptsUsed, max: item.maxAttempts }),
      item.timeLimitMinutes ? t('assessment.timeLimit', { minutes: item.timeLimitMinutes }) : null,
    ]
      .filter(Boolean)
      .join(' · '),
    status: item.status,
    href: `/student/assessments/${item.id}`,
    dueAt: null as string | null,
  }));
  const work = [...assignmentRows, ...quizRows].sort((a, b) => {
    if (a.dueAt && b.dueAt) return a.dueAt.localeCompare(b.dueAt);
    if (a.dueAt) return -1;
    if (b.dueAt) return 1;
    return 0;
  });

  return (
    <div className="space-y-8">
      <StudentPageHeader title={subject.name} />

      <div className="overflow-hidden rounded-xl border border-border p-5">
        <dl className="grid grid-cols-2 gap-4">
          <Detail label={t('student.teacher')}>{subject.teacherName}</Detail>
          <Detail label={t('student.classLabel')}>{subject.className}</Detail>
          <Detail label={t('student.subjectCode')}>{subject.code}</Detail>
          <Detail label={t('student.schedule')}>
            {groups.length === 0 ? (
              <span className="text-muted">{t('student.emptyClassSchedule')}</span>
            ) : (
              <ul className="space-y-1">
                {groups.map((group) => (
                  <li key={`${group.days}-${group.time}`}>
                    {group.days}
                    <span aria-hidden> · </span>
                    <span dir="ltr">{group.time}</span>
                    {group.room ? (
                      <>
                        <span aria-hidden> · </span>
                        {group.room}
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Detail>
        </dl>
        {lessons.length > 0 ? (
          <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
            <StudentProgress
              value={subject.progressPercent}
              label={t('student.progress', { percent: subject.progressPercent })}
            />
            <span
              className={cn(
                'shrink-0 text-xs tabular-nums text-muted',
                subject.progressPercent >= 100 && 'text-accent',
              )}
            >
              {t('student.lessonsComplete', { done: doneCount, total: lessons.length })}
            </span>
          </div>
        ) : null}
      </div>

      {next ? (
        <Link
          to={`/student/classes/${subject.id}/lessons/${next.lesson.id}`}
          className="block rounded-xl text-inherit no-underline"
        >
          <Card className="border-accent/20 bg-accent/10 p-5 transition-colors hover:border-accent/40">
            <p className="text-xs font-medium text-accent">{t('student.continueLearning')}</p>
            <Card.Title className="mt-0.5">{next.lesson.title}</Card.Title>
            <Card.Description>{next.unit.title}</Card.Description>
          </Card>
        </Link>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-2">
        <section className="min-w-0 space-y-3">
          <h2 className="text-lg font-semibold">{t('student.lessons')}</h2>
          {lessons.length === 0 ? (
            <EmptyCard>{t('student.emptyLessons')}</EmptyCard>
          ) : (
            <div className="space-y-5">
              {subject.units.map((unit) => {
                const unitDone = unit.lessons.filter((lesson) => lesson.completed).length;
                return (
                  <div key={unit.id} className="space-y-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <h3 className="min-w-0 truncate text-sm font-medium">{unit.title}</h3>
                      <div className="flex shrink-0 items-center gap-2">
                        {unit.id === currentUnitId ? (
                          <Chip size="sm" color="accent" variant="soft">
                            {t('student.currentUnit')}
                          </Chip>
                        ) : null}
                        <span className="text-xs tabular-nums text-muted">
                          {unitDone}/{unit.lessons.length}
                        </span>
                      </div>
                    </div>
                    <ul className="overflow-hidden rounded-xl border border-border">
                      {unit.lessons.map((lesson) => (
                        <li key={lesson.id} className="border-b border-border last:border-b-0">
                          <ListRow
                            href={`/student/classes/${subject.id}/lessons/${lesson.id}`}
                            title={lesson.title}
                            subtitle={t(lessonTypeKey(lesson.type))}
                            highlight={next?.lesson.id === lesson.id}
                            trailing={
                              lesson.completed ? (
                                <Chip size="sm" color="success" variant="soft">
                                  {t('student.completed')}
                                </Chip>
                              ) : null
                            }
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="min-w-0 space-y-3">
          <h2 className="text-lg font-semibold">{t('student.work')}</h2>
          {work.length === 0 ? (
            <EmptyCard>{t('student.emptyAssignments')}</EmptyCard>
          ) : (
            <ul className="overflow-hidden rounded-xl border border-border">
              {work.map((item) => (
                <li key={`${item.kind}-${item.id}`} className="border-b border-border last:border-b-0">
                  <ListRow
                    href={item.href}
                    title={item.title}
                    subtitle={item.subtitle}
                    danger={item.kind === 'assignment' && dueUrgency(item.dueAt, item.status) === 'overdue'}
                    trailing={
                      item.kind === 'assessment' ? (
                        <QuizStatusChip
                          status={item.status as 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'EXPIRED'}
                        />
                      ) : (
                        <StatusChip status={item.status} />
                      )
                    }
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
