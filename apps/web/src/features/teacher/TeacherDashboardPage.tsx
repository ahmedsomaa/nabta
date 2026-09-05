import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useRef, type ForwardRefExoticComponent, type ReactNode, type RefAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Chip } from '@heroui/react';
import { Bell, CalendarDays, ClipboardList } from 'lucide-react';
import type {
  TeacherActivityItem,
  TeacherClassItem,
  TeacherDashboard,
  TeacherMe,
  TeacherScheduleSlot,
} from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from './QueryState';
import {
  PortalEmptyState,
  PortalList,
  PortalPageHeader,
  portalListRowClass,
} from '@/components/portal/PortalChrome';
import { ClipboardCheckIcon } from '@/components/icons/clipboard-check';
import { CircleHelpIcon } from '@/components/icons/circle-help';
import { UploadIcon } from '@/components/icons/upload';
import { CalendarDaysIcon } from '@/components/icons/calendar-days';
import { cn } from '@/lib/cn';
import { minutesUntilStart, pickActionClass, slotStatus } from './teacherSchedule';
import { formatRelativeActivity, formatWeekdayDate } from './teacherTime';

type IconHandle = {
  startAnimation: () => void;
  stopAnimation: () => void;
};

type AnimatedIcon = ForwardRefExoticComponent<
  { size?: number; className?: string } & RefAttributes<IconHandle>
>;

function greetingKey(hour: number) {
  if (hour < 12) return 'teacher.greetingMorning';
  if (hour < 17) return 'teacher.greetingAfternoon';
  return 'teacher.greetingEvening';
}

function greetingSubtitle(
  t: (key: string, options?: Record<string, unknown>) => string,
  classCount: number,
  pending: number,
) {
  if (classCount > 0 && pending > 0) {
    return t('teacher.greetingSubtitleCounts', { classes: classCount, pending });
  }
  if (classCount > 0) return t('teacher.greetingSubtitleClasses', { classes: classCount });
  if (pending > 0) return t('teacher.greetingSubtitlePending', { pending });
  return t('teacher.greetingSubtitle');
}

function classHref(classId: string, subjectId: string, suffix = '') {
  return `/teacher/classes/${classId}/${subjectId}${suffix}`;
}

function activityLabel(
  item: TeacherActivityItem,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  if (item.kind === 'submission' && item.studentName) {
    return t('teacher.activitySubmitted', { name: item.studentName, title: item.title });
  }
  if (item.kind === 'assessment' && item.studentName) {
    return t('teacher.activityQuiz', { name: item.studentName, title: item.title });
  }
  if (item.kind === 'attendance') {
    return t('teacher.activityAttendance', { count: item.studentCount ?? 0, title: item.title });
  }
  return item.title;
}

function activityHref(item: TeacherActivityItem) {
  if (item.kind === 'attendance') return classHref(item.classId, item.subjectId, '/attendance');
  return classHref(item.classId, item.subjectId);
}

function QuickAction({
  label,
  hint,
  disabled,
  onPress,
  icon: Icon,
}: {
  label: string;
  hint: string;
  disabled?: boolean;
  onPress: () => void;
  icon: AnimatedIcon;
}) {
  const ref = useRef<IconHandle>(null);
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        'rounded-xl border border-border bg-surface text-start transition-colors',
        'hover:border-accent/40',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        'disabled:pointer-events-none disabled:opacity-50',
      )}
      onMouseEnter={() => ref.current?.startAnimation()}
      onMouseLeave={() => ref.current?.stopAnimation()}
      onFocus={() => ref.current?.startAnimation()}
      onBlur={() => ref.current?.stopAnimation()}
      onClick={onPress}
    >
      <span className="flex flex-col gap-3 p-4">
        <span className="inline-flex size-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
          <Icon ref={ref} size={22} aria-hidden />
        </span>
        <span className="block space-y-0.5">
          <p className="text-sm font-medium leading-snug [overflow-wrap:anywhere]">{label}</p>
          <p className="text-xs text-muted [overflow-wrap:anywhere]">{hint}</p>
        </span>
      </span>
    </button>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function slotStatusLabel(
  slot: TeacherScheduleSlot,
  t: (key: string, options?: Record<string, unknown>) => string,
) {
  const status = slotStatus(slot);
  if (status === 'current') return t('teacher.happeningNow');
  if (status === 'completed') return t('teacher.completed');
  const minutes = minutesUntilStart(slot);
  if (minutes != null && minutes > 0) return t('teacher.startsIn', { minutes });
  return null;
}

export function TeacherDashboardPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const me = useQuery({ queryKey: ['teacher-me'], queryFn: () => apiFetch<TeacherMe>('/teacher/me') });
  const dash = useQuery({
    queryKey: ['teacher-dashboard'],
    queryFn: () => apiFetch<TeacherDashboard>('/teacher/dashboard'),
  });
  const classes = useQuery({
    queryKey: ['teacher-classes'],
    queryFn: () => apiFetch<TeacherClassItem[]>('/teacher/classes'),
  });

  if (me.isLoading || dash.isLoading) return <QueryLoading variant="teacherDashboard" />;
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

  const data = dash.data;
  const hour = new Date().getHours();
  const pending = data.toGrade.reduce((sum, item) => sum + item.pending, 0);
  const fallback = classes.data?.[0]
    ? {
        classId: classes.data[0].classId,
        subjectId: classes.data[0].subjectId,
        startsAt: '00:00',
        endsAt: '00:00',
      }
    : undefined;
  const target = pickActionClass(data.schedule, fallback);
  const hasClasses = Boolean(target || (classes.data && classes.data.length > 0));

  return (
    <div className="space-y-8">
      <PortalPageHeader
        title={t(greetingKey(hour), { name: me.data.givenName })}
        subtitle={greetingSubtitle(t, data.schedule.length, pending)}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('teacher.quickActions')}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickAction
            label={t('teacher.createAssignment')}
            hint={t('teacher.createAssignmentHint')}
            icon={ClipboardCheckIcon}
            onPress={() => navigate('/teacher/assignments/new')}
          />
          <QuickAction
            label={t('teacher.createQuiz')}
            hint={t('teacher.createQuizHint')}
            icon={CircleHelpIcon}
            onPress={() => navigate('/teacher/assessments/new')}
          />
          <QuickAction
            label={t('teacher.uploadMaterial')}
            hint={t('teacher.uploadMaterialHint')}
            icon={UploadIcon}
            disabled={!hasClasses}
            onPress={() =>
              target && navigate(classHref(target.classId, target.subjectId, '/materials'))
            }
          />
          <QuickAction
            label={t('teacher.takeAttendance')}
            hint={t('teacher.takeAttendanceHint')}
            icon={CalendarDaysIcon}
            disabled={!hasClasses}
            onPress={() =>
              target && navigate(classHref(target.classId, target.subjectId, '/attendance'))
            }
          />
        </div>
      </section>

      <Section
        title={t('teacher.todayClasses')}
        action={
          <span className="text-sm text-muted">{formatWeekdayDate(new Date(), i18n.language)}</span>
        }
      >
        {data.schedule.length === 0 ? (
          <PortalEmptyState icon={CalendarDays}>{t('teacher.emptySchedule')}</PortalEmptyState>
        ) : (
          <PortalList>
            {data.schedule.map((slot) => {
              const status = slotStatus(slot);
              const statusLabel = slotStatusLabel(slot, t);
              return (
                <li key={slot.id} className="border-b border-border last:border-b-0">
                  <div className={cn(portalListRowClass, 'flex-col items-stretch sm:flex-row sm:items-center')}>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p dir="ltr" className="text-sm font-medium tabular-nums">
                        {slot.startsAt}–{slot.endsAt}
                      </p>
                      <p className="font-medium [overflow-wrap:anywhere]">{slot.subjectName}</p>
                      <p className="text-xs text-muted">
                        {[
                          slot.className,
                          slot.room ? t('teacher.room', { room: slot.room }) : null,
                          t('teacher.studentsCount', { count: slot.studentCount }),
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {statusLabel ? (
                          <Chip
                            size="sm"
                            color={status === 'current' ? 'accent' : 'default'}
                            variant="soft"
                          >
                            {statusLabel}
                          </Chip>
                        ) : null}
                        <Chip
                          size="sm"
                          color={slot.attendanceTaken ? 'success' : 'warning'}
                          variant="soft"
                        >
                          {slot.attendanceTaken
                            ? t('teacher.attendanceRecorded')
                            : t('teacher.attendanceMissing')}
                        </Chip>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {!slot.attendanceTaken ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onPress={() =>
                            navigate(classHref(slot.classId, slot.subjectId, '/attendance'))
                          }
                        >
                          {t('teacher.takeAttendance')}
                        </Button>
                      ) : null}
                      <Button
                        size="sm"
                        variant="primary"
                        onPress={() => navigate(classHref(slot.classId, slot.subjectId))}
                      >
                        {t('teacher.openClass')}
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </PortalList>
        )}
      </Section>

      <Section title={t('teacher.needsAttention')}>
        {data.toGrade.length === 0 && data.alerts.length === 0 ? (
          <PortalEmptyState icon={Bell}>
            <p className="font-medium text-foreground">{t('teacher.caughtUp')}</p>
            <p>{t('teacher.caughtUpHint')}</p>
          </PortalEmptyState>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="overflow-hidden rounded-xl border border-border bg-surface">
              <div className="space-y-1 px-4 py-4">
                <h3 className="font-semibold">{t('teacher.toGrade')}</h3>
                <p className="text-sm text-muted">
                  {data.toGrade.length === 0
                    ? t('teacher.emptyToGrade')
                    : t('teacher.toGradeWaiting', { count: pending })}
                </p>
              </div>
              {data.toGrade.length > 0 ? (
                <ul>
                  {data.toGrade.slice(0, 3).map((item) => (
                    <li key={item.assignmentId} className="border-t border-border">
                      <Link
                        to={`/teacher/assignments/${item.assignmentId}/submissions`}
                        className={portalListRowClass}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{item.title}</p>
                          <p className="mt-0.5 truncate text-xs text-muted">
                            {item.className} · {item.subjectName} ·{' '}
                            {t('teacher.pendingCount', { count: item.pending })}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
              {data.toGrade.length > 3 ? (
                <div className="border-t border-border px-4 py-3">
                  <Link
                    to="/teacher/assignments"
                    className="text-sm text-muted no-underline hover:text-accent"
                  >
                    {t('teacher.viewAll')}
                  </Link>
                </div>
              ) : null}
            </div>

            <div className="overflow-hidden rounded-xl border border-border bg-surface">
              <div className="space-y-1 px-4 py-4">
                <h3 className="font-semibold">{t('teacher.alerts')}</h3>
                <p className="text-sm text-muted">
                  {data.alerts.length === 0
                    ? t('teacher.emptyAlerts')
                    : t('teacher.alertsCount', { count: data.alerts.length })}
                </p>
              </div>
              {data.alerts.length > 0 ? (
                <ul>
                  {data.alerts.slice(0, 3).map((alert) => (
                    <li
                      key={`${alert.kind}-${alert.classId}-${alert.subjectId}-${alert.message}`}
                      className="border-t border-border"
                    >
                      <Link
                        to={classHref(alert.classId, alert.subjectId)}
                        className={portalListRowClass}
                      >
                        <p className="min-w-0 flex-1 font-medium [overflow-wrap:anywhere]">
                          {alert.message}
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        )}
      </Section>

      <Section title={t('teacher.recentActivity')}>
        {data.recentActivity.length === 0 ? (
          <PortalEmptyState icon={ClipboardList}>{t('teacher.emptyActivity')}</PortalEmptyState>
        ) : (
          <PortalList>
            {data.recentActivity.map((item) => (
              <li key={`${item.kind}-${item.id}`} className="border-b border-border last:border-b-0">
                <Link to={activityHref(item)} className={portalListRowClass}>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium [overflow-wrap:anywhere]">{activityLabel(item, t)}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {item.className} · {item.subjectName} ·{' '}
                      {formatRelativeActivity(item.occurredAt, i18n.language, t)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </PortalList>
        )}
      </Section>
    </div>
  );
}
