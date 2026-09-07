import { useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button, Chip } from '@heroui/react';
import type { LucideIcon } from 'lucide-react';
import {
  BookOpen,
  ClipboardList,
  FileQuestion,
  Paperclip,
  Timer,
  Users,
} from 'lucide-react';
import type {
  TeacherAssignmentListItem,
  TeacherAttendance,
  TeacherClassDetail,
  TeacherLessonSummary,
  TeacherMaterialItem,
  TeacherRosterRow,
} from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { formatDue } from '@/features/student/StatusChip';
import {
  PortalEmptyState,
  PortalList,
  PortalMetric,
  PortalPanel,
  PortalProgress,
  portalListRowClass,
} from '@/components/portal/PortalChrome';
import { PortalFilterChips } from '@/components/portal/PortalTabs';
import { formatRelativeActivity } from './teacherTime';
import { cn } from '@/lib/cn';

type ClassOutlet = { detail: TeacherClassDetail; roster: TeacherRosterRow[] };

function todayIso() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function useClassOutlet() {
  return useOutletContext<ClassOutlet>();
}

function classBase(classId: string, subjectId: string) {
  return `/teacher/classes/${classId}/${subjectId}`;
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {action}
    </div>
  );
}

const tableWrapperClass = 'overflow-x-auto rounded-xl border border-border bg-surface';
const tableClass = 'w-full text-start text-sm [&_td]:text-start [&_th]:text-start';
const headCellClass = 'px-4 py-2 text-start text-xs font-medium text-muted';

export function TeacherClassOverviewPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { classId = '', subjectId = '' } = useParams();
  const { detail, roster } = useClassOutlet();
  const attendance = useQuery({
    queryKey: ['teacher-attendance', classId, subjectId, todayIso()],
    queryFn: () =>
      apiFetch<TeacherAttendance>(
        `/teacher/attendance?classId=${classId}&subjectId=${subjectId}&date=${todayIso()}`,
      ),
    enabled: Boolean(classId && subjectId),
  });
  const base = classBase(classId, subjectId);
  const lessonCount = detail.units.reduce((sum, unit) => sum + unit.lessons.length, 0);
  const pending = detail.assignments.reduce((sum, item) => sum + item.pendingCount, 0);
  const recorded = attendance.data?.records.filter((row) => row.status != null).length ?? 0;
  const now = Date.now();
  const upcoming = detail.assignments
    .filter((item) => item.publishedAt && new Date(item.dueAt).getTime() >= now)
    .slice(0, 4);
  const toGrade = detail.assignments
    .filter((item) => item.pendingCount > 0)
    .sort((a, b) => b.pendingCount - a.pendingCount)
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <PortalMetric
          label={t('teacher.tabStudents')}
          value={String(detail.studentCount)}
          icon={Users}
          onPress={() => navigate(`${base}/students`)}
        />
        <PortalMetric
          label={t('teacher.toGrade')}
          value={String(pending)}
          icon={ClipboardList}
          tone={pending > 0 ? 'warning' : 'accent'}
          onPress={() => navigate(`${base}/assignments`)}
        />
        <PortalMetric
          label={t('teacher.tabLessons')}
          value={String(lessonCount)}
          icon={BookOpen}
          onPress={() => navigate(`${base}/lessons`)}
        />
      </div>

      <section className="space-y-3">
        <SectionHeader title={t('teacher.todayAttendance')} />
        <PortalPanel>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0 space-y-2">
              {detail.todaySlots.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  {detail.todaySlots.map((slot) => (
                    <Chip key={`${slot.startsAt}-${slot.endsAt}`} size="sm" variant="soft">
                      <span dir="ltr" className="tabular-nums">
                        {slot.startsAt}–{slot.endsAt}
                      </span>
                      {slot.room ? ` · ${t('teacher.room', { room: slot.room })}` : ''}
                    </Chip>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">{t('teacher.emptySchedule')}</p>
              )}
              {attendance.isLoading ? (
                <p className="text-sm text-muted">{t('teacher.loading')}</p>
              ) : (
                <p className="text-sm">
                  {t('teacher.recordedOf', { recorded, total: roster.length })}
                  {' · '}
                  <span className="text-muted">
                    {recorded === roster.length && roster.length > 0
                      ? t('teacher.attendanceRecorded')
                      : t('teacher.attendanceMissing')}
                  </span>
                </p>
              )}
            </div>
            <Button size="sm" variant="secondary" onPress={() => navigate(`${base}/attendance`)}>
              {t('teacher.takeAttendance')}
            </Button>
          </div>
        </PortalPanel>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <SectionHeader
            title={t('teacher.upcomingWork')}
            action={
              <Link
                to={`${base}/assignments`}
                className="text-sm text-muted no-underline hover:text-accent"
              >
                {t('teacher.viewAll')}
              </Link>
            }
          />
          {upcoming.length === 0 ? (
            <PortalEmptyState icon={ClipboardList}>{t('teacher.emptyUpcomingWork')}</PortalEmptyState>
          ) : (
            <PortalList>
              {upcoming.map((item) => (
                <li key={item.id} className="border-b border-border last:border-b-0">
                  <Link to={`/teacher/assignments/${item.id}`} className={portalListRowClass}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.title}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {t('teacher.due', { date: formatDue(item.dueAt, i18n.language) })}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-muted">
                      {item.submissionCount}/{detail.studentCount}
                    </span>
                  </Link>
                </li>
              ))}
            </PortalList>
          )}
        </section>

        <section className="space-y-3">
          <SectionHeader
            title={t('teacher.toGrade')}
            action={
              <Link
                to={`${base}/assignments`}
                className="text-sm text-muted no-underline hover:text-accent"
              >
                {t('teacher.viewAll')}
              </Link>
            }
          />
          {toGrade.length === 0 ? (
            <PortalEmptyState icon={ClipboardList}>{t('teacher.emptyToGrade')}</PortalEmptyState>
          ) : (
            <PortalList>
              {toGrade.map((item) => (
                <li key={item.id} className="border-b border-border last:border-b-0">
                  <Link
                    to={`/teacher/assignments/${item.id}/submissions`}
                    className={portalListRowClass}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.title}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {t('teacher.pendingToGrade', { count: item.pendingCount })}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-accent">
                      {t('teacher.gradeAction')}
                    </span>
                  </Link>
                </li>
              ))}
            </PortalList>
          )}
        </section>
      </div>

      <section className="space-y-3">
        <SectionHeader title={t('teacher.recentActivity')} />
        {detail.recentActivity.length === 0 ? (
          <PortalEmptyState icon={ClipboardList}>{t('teacher.emptyActivity')}</PortalEmptyState>
        ) : (
          <PortalList>
            {detail.recentActivity.map((item) => (
              <li key={`${item.kind}-${item.id}`} className="border-b border-border last:border-b-0">
                <div className="px-3 py-2.5">
                  <p className="font-medium [overflow-wrap:anywhere]">
                    {item.kind === 'submission' && item.studentName
                      ? t('teacher.activitySubmitted', { name: item.studentName, title: item.title })
                      : item.kind === 'assessment' && item.studentName
                        ? t('teacher.activityQuiz', { name: item.studentName, title: item.title })
                        : item.kind === 'attendance'
                          ? t('teacher.activityAttendance', {
                              count: item.studentCount ?? 0,
                              title: item.title,
                            })
                          : item.title}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {formatRelativeActivity(item.occurredAt, i18n.language, t)}
                  </p>
                </div>
              </li>
            ))}
          </PortalList>
        )}
      </section>
    </div>
  );
}

type StudentFilter = 'all' | 'missingWork' | 'lowAttendance';

export function TeacherClassStudentsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { classId = '', subjectId = '' } = useParams();
  const { roster } = useClassOutlet();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<StudentFilter>('all');
  const base = classBase(classId, subjectId);

  if (roster.length === 0) {
    return <PortalEmptyState icon={Users}>{t('teacher.emptyRoster')}</PortalEmptyState>;
  }

  const needle = search.trim().toLowerCase();
  const missingWorkCount = roster.filter((row) => row.missingWork > 0).length;
  const lowAttendanceCount = roster.filter(
    (row) => row.attendancePercent != null && row.attendancePercent < 90,
  ).length;
  const visible = roster.filter((row) => {
    if (filter === 'missingWork' && row.missingWork === 0) return false;
    if (
      filter === 'lowAttendance' &&
      !(row.attendancePercent != null && row.attendancePercent < 90)
    ) {
      return false;
    }
    if (!needle) return true;
    return `${row.givenName} ${row.familyName}`.toLowerCase().includes(needle);
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="block">
          <span className="sr-only">{t('teacher.searchStudents')}</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('teacher.searchStudents')}
            className="w-full max-w-xs rounded-lg border border-border bg-surface px-3 py-2 text-sm"
          />
        </label>
        <PortalFilterChips
          value={filter}
          onChange={setFilter}
          options={[
            { id: 'all', label: t('teacher.filterAll'), count: roster.length },
            { id: 'missingWork', label: t('teacher.missingWork'), count: missingWorkCount },
            {
              id: 'lowAttendance',
              label: t('teacher.filterLowAttendance'),
              count: lowAttendanceCount,
            },
          ]}
        />
      </div>

      {visible.length === 0 ? (
        <PortalEmptyState icon={Users}>{t('teacher.emptyFilter')}</PortalEmptyState>
      ) : (
        <div className={tableWrapperClass}>
          <table className={cn(tableClass, 'min-w-[42rem]')}>
            <thead>
              <tr className="border-b border-border">
                <th className={headCellClass}>{t('teacher.student')}</th>
                <th className={headCellClass}>{t('teacher.progress')}</th>
                <th className={headCellClass}>{t('teacher.attendance')}</th>
                <th className={headCellClass}>{t('teacher.average')}</th>
                <th className={headCellClass}>{t('teacher.missingWork')}</th>
                <th className={cn(headCellClass, 'text-end')}>{t('teacher.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr
                  key={row.studentId}
                  className="cursor-pointer border-t border-border hover:bg-overlay"
                  onClick={() => navigate(`${base}/students/${row.studentId}`)}
                >
                  <td className="px-4 py-3 font-medium [overflow-wrap:anywhere]">
                    {row.givenName} {row.familyName}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 shrink-0">
                        <PortalProgress value={row.progressPercent} label={t('teacher.progress')} />
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-muted">
                        {row.progressPercent}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {row.attendancePercent == null
                      ? t('teacher.noGrade')
                      : `${row.attendancePercent}%`}
                  </td>
                  <td className="px-4 py-3 tabular-nums">
                    {row.average == null ? t('teacher.noGrade') : `${row.average}%`}
                  </td>
                  <td className="px-4 py-3">
                    {row.missingWork > 0 ? (
                      <Chip size="sm" variant="soft" color="warning">
                        {row.missingWork}
                      </Chip>
                    ) : (
                      <span className="text-muted">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <Link
                      to={`${base}/students/${row.studentId}`}
                      className="text-xs font-medium text-accent no-underline hover:opacity-80"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {t('teacher.open')}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function TeacherClassLessonsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { classId = '', subjectId = '' } = useParams();
  const { detail } = useClassOutlet();
  const base = classBase(classId, subjectId);
  const materials = useQuery({
    queryKey: ['teacher-materials', classId, subjectId],
    queryFn: () =>
      apiFetch<TeacherMaterialItem[]>(
        `/teacher/classes/${classId}/subjects/${subjectId}/materials`,
      ),
    enabled: Boolean(classId && subjectId),
  });
  const materialCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of materials.data ?? []) {
      counts.set(item.lessonId, (counts.get(item.lessonId) ?? 0) + 1);
    }
    return counts;
  }, [materials.data]);

  let step = 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button size="sm" variant="primary" onPress={() => navigate(`${base}/builder`)}>
          {t('teacher.editStructure')}
        </Button>
      </div>
      {detail.units.length === 0 ? (
        <PortalEmptyState
          icon={BookOpen}
          action={{ label: t('teacher.editStructure'), onPress: () => navigate(`${base}/builder`) }}
        >
          {t('teacher.emptyLessons')}
        </PortalEmptyState>
      ) : (
        detail.units.map((unit) => (
          <section key={unit.id} className="space-y-3">
            <h2 className="text-lg font-semibold">{unit.title}</h2>
            {unit.lessons.length === 0 ? (
              <p className="text-sm text-muted">{t('teacher.emptyLessons')}</p>
            ) : (
              <ol>
                {unit.lessons.map((lesson, index) => {
                  step += 1;
                  return (
                    <LessonStep
                      key={lesson.id}
                      step={step}
                      lesson={lesson}
                      isLast={index === unit.lessons.length - 1}
                      materialCount={materialCounts.get(lesson.id) ?? 0}
                      onOpen={() => navigate(`${base}/builder`)}
                    />
                  );
                })}
              </ol>
            )}
          </section>
        ))
      )}
    </div>
  );
}

function LessonStep({
  step,
  lesson,
  isLast,
  materialCount,
  onOpen,
}: {
  step: number;
  lesson: TeacherLessonSummary;
  isLast: boolean;
  materialCount: number;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  return (
    <li className="flex items-stretch gap-3">
      <div className="flex flex-col items-center">
        <span
          className={cn(
            'inline-flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums',
            lesson.publishedAt ? 'bg-accent/10 text-accent' : 'bg-default text-muted',
          )}
        >
          {step}
        </span>
        {isLast ? null : <span className="mt-1 w-px flex-1 bg-border" aria-hidden />}
      </div>
      <div className="mb-2 flex min-w-0 flex-1 flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{lesson.title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
            <span>{t(`teacher.types.${lesson.type}`)}</span>
            {materialCount > 0 ? (
              <span className="flex items-center gap-1">
                <Paperclip className="size-3" aria-hidden />
                {materialCount}
              </span>
            ) : null}
          </p>
        </div>
        <Chip size="sm" variant="soft" color={lesson.publishedAt ? 'success' : 'default'}>
          {lesson.publishedAt ? t('teacher.published') : t('teacher.draft')}
        </Chip>
        <button
          type="button"
          onClick={onOpen}
          className="text-xs font-medium text-accent hover:opacity-80"
        >
          {t('teacher.open')}
        </button>
      </div>
    </li>
  );
}

function assignmentStatus(item: TeacherAssignmentListItem, t: (key: string) => string) {
  if (!item.publishedAt) return { label: t('teacher.draft'), color: 'default' as const };
  if (item.pendingCount > 0) return { label: t('teacher.toGrade'), color: 'warning' as const };
  if (item.submissionCount > 0 && item.gradedCount === item.submissionCount) {
    return { label: t('teacher.tabGraded'), color: 'success' as const };
  }
  return { label: t('teacher.published'), color: 'success' as const };
}

export function TeacherClassAssignmentsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { detail } = useClassOutlet();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="primary" onPress={() => navigate('/teacher/assignments/new')}>
          {t('teacher.newAssignment')}
        </Button>
      </div>
      {detail.assignments.length === 0 ? (
        <PortalEmptyState
          icon={ClipboardList}
          action={{
            label: t('teacher.newAssignment'),
            onPress: () => navigate('/teacher/assignments/new'),
          }}
        >
          {t('teacher.emptyAssignments')}
        </PortalEmptyState>
      ) : (
        <div className={tableWrapperClass}>
          <table className={cn(tableClass, 'min-w-[46rem]')}>
            <thead>
              <tr className="border-b border-border">
                <th className={headCellClass}>{t('teacher.tabAssignments')}</th>
                <th className={headCellClass}>{t('teacher.dueDate')}</th>
                <th className={headCellClass}>{t('teacher.submissions')}</th>
                <th className={headCellClass}>{t('teacher.tabGraded')}</th>
                <th className={headCellClass}>{t('teacher.status')}</th>
                <th className={cn(headCellClass, 'text-end')}>{t('teacher.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {detail.assignments.map((item) => {
                const status = assignmentStatus(item, t);
                return (
                  <tr key={item.id} className="border-t border-border hover:bg-overlay">
                    <td className="px-4 py-3">
                      <Link
                        to={`/teacher/assignments/${item.id}`}
                        className="font-medium text-inherit no-underline hover:text-accent [overflow-wrap:anywhere]"
                      >
                        {item.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">{formatDue(item.dueAt, i18n.language)}</td>
                    <td className="px-4 py-3 tabular-nums">
                      {item.submissionCount}/{detail.studentCount}
                    </td>
                    <td className="px-4 py-3 tabular-nums">
                      {item.gradedCount}/{item.submissionCount}
                    </td>
                    <td className="px-4 py-3">
                      <Chip size="sm" variant="soft" color={status.color}>
                        {status.label}
                      </Chip>
                    </td>
                    <td className="px-4 py-3 text-end">
                      <Link
                        to={`/teacher/assignments/${item.id}/submissions`}
                        className="text-xs font-medium text-accent no-underline hover:opacity-80"
                      >
                        {item.pendingCount > 0 ? t('teacher.gradeAction') : t('teacher.submissions')}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function TeacherClassQuizzesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { classId = '', subjectId = '' } = useParams();
  const { detail } = useClassOutlet();
  const newQuizHref = `/teacher/assessments/new?classId=${classId}&subjectId=${subjectId}`;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="primary" onPress={() => navigate(newQuizHref)}>
          {t('teacher.newQuiz')}
        </Button>
      </div>
      {detail.assessments.length === 0 ? (
        <PortalEmptyState
          icon={FileQuestion}
          action={{ label: t('teacher.newQuiz'), onPress: () => navigate(newQuizHref) }}
        >
          {t('teacher.emptyQuizzes')}
        </PortalEmptyState>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {detail.assessments.map((item) => {
            const completion =
              detail.studentCount > 0
                ? Math.min(100, Math.round((item.attemptCount / detail.studentCount) * 100))
                : 0;
            return (
              <div
                key={item.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link
                    to={`/teacher/assessments/${item.id}`}
                    className="min-w-0 font-medium text-inherit no-underline hover:text-accent [overflow-wrap:anywhere]"
                  >
                    {item.title}
                  </Link>
                  <Chip
                    size="sm"
                    variant="soft"
                    color={item.publishedAt ? 'success' : 'default'}
                  >
                    {item.publishedAt ? t('teacher.published') : t('teacher.draft')}
                  </Chip>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                  <QuizFact
                    icon={FileQuestion}
                    text={t('teacher.questionCount', { count: item.questionCount })}
                  />
                  <QuizFact
                    icon={Timer}
                    text={
                      item.timeLimitMinutes == null
                        ? t('teacher.noTimeLimit')
                        : t('teacher.minutesShort', { count: item.timeLimitMinutes })
                    }
                  />
                  <QuizFact
                    icon={Users}
                    text={t('teacher.attemptCount', { count: item.attemptCount })}
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>{t('teacher.completion')}</span>
                    <span className="tabular-nums">
                      {item.attemptCount}/{detail.studentCount}
                    </span>
                  </div>
                  <PortalProgress value={completion} label={t('teacher.completion')} />
                </div>
                <div className="flex gap-3 pt-1 text-xs font-medium">
                  <Link
                    to={`/teacher/assessments/${item.id}`}
                    className="text-accent no-underline hover:opacity-80"
                  >
                    {t('teacher.open')}
                  </Link>
                  <Link
                    to={`/teacher/assessments/${item.id}/results`}
                    className="text-muted no-underline hover:text-accent"
                  >
                    {t('teacher.results')}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function QuizFact({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {text}
    </span>
  );
}

export { TeacherClassMaterialsPage } from './TeacherClassMaterialsPage';
