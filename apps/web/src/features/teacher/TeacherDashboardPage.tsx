import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useRef, type ForwardRefExoticComponent, type ReactNode, type RefAttributes } from 'react';
import { useTranslation } from 'react-i18next';
import { Chip } from '@heroui/react';
import { Bell, CalendarDays, ClipboardList } from 'lucide-react';
import type { TeacherDashboard, TeacherMe, TeacherScheduleSlot } from '@nabta/types';
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

function minutesFromClock(clock: string) {
  const [hours, minutes] = clock.split(':').map(Number);
  if (hours == null || minutes == null || !Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
}

function isCurrentSlot(slot: TeacherScheduleSlot, now = new Date()) {
  const start = minutesFromClock(slot.startsAt);
  const end = minutesFromClock(slot.endsAt);
  if (start == null || end == null) return false;
  const current = now.getHours() * 60 + now.getMinutes();
  return current >= start && current < end;
}

function QuickAction({
  label,
  disabled,
  onPress,
  icon: Icon,
}: {
  label: string;
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
        'overflow-hidden rounded-xl border border-border text-start transition-colors',
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
      <span className="flex h-14 items-center justify-center bg-accent/10 text-accent md:h-16">
        <Icon ref={ref} size={24} aria-hidden />
      </span>
      <p className="px-3 py-2.5 text-sm font-medium leading-snug [overflow-wrap:anywhere]">{label}</p>
    </button>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="min-w-0 space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function TeacherDashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const me = useQuery({ queryKey: ['teacher-me'], queryFn: () => apiFetch<TeacherMe>('/teacher/me') });
  const dash = useQuery({
    queryKey: ['teacher-dashboard'],
    queryFn: () => apiFetch<TeacherDashboard>('/teacher/dashboard'),
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

  const firstClass = dash.data.schedule[0];
  const hour = new Date().getHours();
  const data = dash.data;

  return (
    <div className="space-y-6">
      <PortalPageHeader title={t(greetingKey(hour), { name: me.data.givenName })} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('teacher.quickActions')}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <QuickAction
            label={t('teacher.createAssignment')}
            icon={ClipboardCheckIcon}
            onPress={() => navigate('/teacher/assignments/new')}
          />
          <QuickAction
            label={t('teacher.createQuiz')}
            icon={CircleHelpIcon}
            onPress={() => navigate('/teacher/assessments/new')}
          />
          <QuickAction
            label={t('teacher.uploadMaterial')}
            icon={UploadIcon}
            disabled={!firstClass}
            onPress={() =>
              firstClass &&
              navigate(`/teacher/classes/${firstClass.classId}/${firstClass.subjectId}/builder`)
            }
          />
          <QuickAction
            label={t('teacher.takeAttendance')}
            icon={CalendarDaysIcon}
            disabled={!firstClass}
            onPress={() =>
              firstClass &&
              navigate(`/teacher/classes/${firstClass.classId}/${firstClass.subjectId}/attendance`)
            }
          />
        </div>
      </section>

      <div className="grid items-start gap-8 lg:grid-cols-2">
        <div className="space-y-8">
          <Section title={t('teacher.todayClasses')}>
            {data.schedule.length === 0 ? (
              <PortalEmptyState icon={CalendarDays}>{t('teacher.emptySchedule')}</PortalEmptyState>
            ) : (
              <PortalList>
                {data.schedule.map((slot) => {
                  const current = isCurrentSlot(slot);
                  return (
                    <li key={slot.id} className="border-b border-border last:border-b-0">
                      <Link
                        to={`/teacher/classes/${slot.classId}/${slot.subjectId}`}
                        className={cn(portalListRowClass, 'items-center', current && 'bg-accent/5')}
                      >
                        <span dir="ltr" className="w-[7.5rem] shrink-0 text-sm font-medium tabular-nums">
                          {slot.startsAt}–{slot.endsAt}
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          {slot.className} · {slot.subjectName}
                        </span>
                        {current ? (
                          <Chip size="sm" color="accent" variant="soft">
                            {t('student.happeningNow')}
                          </Chip>
                        ) : null}
                        {slot.room ? (
                          <span className="shrink-0 text-xs text-muted">
                            {t('teacher.room', { room: slot.room })}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </PortalList>
            )}
          </Section>

          <Section title={t('teacher.toGrade')}>
            {data.toGrade.length === 0 ? (
              <PortalEmptyState icon={ClipboardList}>{t('teacher.emptyToGrade')}</PortalEmptyState>
            ) : (
              <PortalList>
                {data.toGrade.map((item) => (
                  <li key={item.assignmentId} className="border-b border-border last:border-b-0">
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
                      <Chip size="sm" color="warning" variant="soft">
                        {t('teacher.pendingCount', { count: item.pending })}
                      </Chip>
                    </Link>
                  </li>
                ))}
              </PortalList>
            )}
          </Section>
        </div>

        <Section title={t('teacher.alerts')}>
          {data.alerts.length === 0 ? (
            <PortalEmptyState icon={Bell}>{t('teacher.emptyAlerts')}</PortalEmptyState>
          ) : (
            <PortalList>
              {data.alerts.map((alert) => (
                <li
                  key={`${alert.kind}-${alert.classId}-${alert.subjectId}-${alert.message}`}
                  className="border-b border-border last:border-b-0"
                >
                  <Link
                    to={`/teacher/classes/${alert.classId}/${alert.subjectId}`}
                    className={portalListRowClass}
                  >
                    <p className="min-w-0 flex-1 font-medium [overflow-wrap:anywhere]">{alert.message}</p>
                  </Link>
                </li>
              ))}
            </PortalList>
          )}
        </Section>
      </div>
    </div>
  );
}
