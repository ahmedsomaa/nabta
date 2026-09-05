import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, CalendarDays, CircleHelp, ClipboardList, Users } from 'lucide-react';
import { Chip } from '@heroui/react';
import type { TeacherClassItem } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from './QueryState';
import { PortalEmptyState, PortalPageHeader } from '@/components/portal/PortalChrome';
import { PortalFilterChips } from '@/components/portal/PortalTabs';
import { BookTextIcon, type BookTextIconHandle } from '@/components/icons/book-text';
import { formatScheduleLine } from './teacherSchedule';

type ClassFilter = 'all' | 'needsGrading' | 'hasQuiz';

function ClassStat({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted">
      <Icon className="size-3.5 shrink-0" aria-hidden />
      <span className="min-w-0 [overflow-wrap:anywhere]">{text}</span>
    </span>
  );
}

function ClassCard({ item }: { item: TeacherClassItem }) {
  const { t } = useTranslation();
  const iconRef = useRef<BookTextIconHandle>(null);
  const schedule = formatScheduleLine(
    item.schedule,
    (day) => t(`student.weekdayShort.${day}`),
    t('student.everyDay'),
  );
  const meta = [item.className, item.subjectCode].filter(Boolean).join(' · ');

  return (
    <Link
      to={`/teacher/classes/${item.classId}/${item.subjectId}`}
      className="rounded-xl text-start text-inherit no-underline"
      onMouseEnter={() => iconRef.current?.startAnimation()}
      onMouseLeave={() => iconRef.current?.stopAnimation()}
    >
      <div className="rounded-xl border border-border bg-surface p-3 transition-colors hover:border-accent/40">
        <div className="flex h-24 items-center justify-center rounded-lg bg-accent/10 text-accent md:h-28">
          <BookTextIcon ref={iconRef} size={32} aria-hidden />
        </div>
        <div className="space-y-2 pt-3">
          <p className="text-base font-semibold leading-snug [overflow-wrap:anywhere]">{item.subjectName}</p>
          <p className="truncate text-sm text-muted">{meta}</p>
          <div className="grid gap-x-3 gap-y-1 sm:grid-cols-2">
            <ClassStat icon={Users} text={t('teacher.studentsCount', { count: item.studentCount })} />
            {schedule ? <ClassStat icon={CalendarDays} text={schedule} /> : null}
            {item.pendingCount > 0 ? (
              <ClassStat icon={ClipboardList} text={t('teacher.pendingToGrade', { count: item.pendingCount })} />
            ) : null}
            {item.publishedQuizCount > 0 ? (
              <ClassStat
                icon={CircleHelp}
                text={t('teacher.publishedQuizCount', { count: item.publishedQuizCount })}
              />
            ) : null}
          </div>
          {item.attendanceTakenToday != null ? (
            <Chip
              size="sm"
              variant="soft"
              color={item.attendanceTakenToday ? 'success' : 'warning'}
            >
              {item.attendanceTakenToday
                ? t('teacher.attendanceRecorded')
                : t('teacher.attendanceMissing')}
            </Chip>
          ) : null}
          <p className="flex items-center gap-1 pt-1 text-xs font-medium text-accent">
            {t('teacher.openClass')}
            <ArrowRight className="size-3.5 rtl:rotate-180" aria-hidden />
          </p>
        </div>
      </div>
    </Link>
  );
}

export function TeacherClassesPage() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<ClassFilter>('all');
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: ['teacher-classes'],
    queryFn: () => apiFetch<TeacherClassItem[]>('/teacher/classes'),
  });

  if (query.isLoading) return <QueryLoading variant="squares" />;
  if (query.isError || !query.data) return <QueryError onRetry={() => void query.refetch()} />;

  const needle = search.trim().toLowerCase();
  const visible = query.data.filter((item) => {
    if (filter === 'needsGrading' && item.pendingCount === 0) return false;
    if (filter === 'hasQuiz' && item.publishedQuizCount === 0) return false;
    if (!needle) return true;
    return [item.subjectName, item.className, item.subjectCode]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(needle));
  });

  return (
    <div className="space-y-6">
      <PortalPageHeader title={t('teacher.myClasses')} subtitle={t('teacher.classesSubtitle')} />
      {query.data.length === 0 ? (
        <PortalEmptyState icon={BookTextIcon}>{t('teacher.emptyClasses')}</PortalEmptyState>
      ) : (
        <>
          <label className="block">
            <span className="sr-only">{t('teacher.searchClasses')}</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('teacher.searchClasses')}
              className="w-full max-w-sm rounded-lg border border-border bg-surface px-3 py-2 text-sm"
            />
          </label>
          <PortalFilterChips
            value={filter}
            onChange={setFilter}
            options={[
              { id: 'all', label: t('teacher.filterAll'), count: query.data.length },
              {
                id: 'needsGrading',
                label: t('teacher.filterNeedsGrading'),
                count: query.data.filter((item) => item.pendingCount > 0).length,
              },
              {
                id: 'hasQuiz',
                label: t('teacher.filterHasQuiz'),
                count: query.data.filter((item) => item.publishedQuizCount > 0).length,
              },
            ]}
          />
          {visible.length === 0 ? (
            <PortalEmptyState icon={BookTextIcon}>{t('teacher.emptyFilter')}</PortalEmptyState>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {visible.map((item) => (
                <ClassCard key={`${item.classId}-${item.subjectId}`} item={item} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
