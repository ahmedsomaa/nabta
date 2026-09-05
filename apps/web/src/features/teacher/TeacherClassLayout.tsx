import { useRef } from 'react';
import { Link, Outlet, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import type { TeacherClassDetail, TeacherRosterRow } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from './QueryState';
import { PortalNavTabs } from '@/components/portal/PortalTabs';
import { usePageTrail } from '@/layouts/PageTrail';
import { BookTextIcon, type BookTextIconHandle } from '@/components/icons/book-text';

export function TeacherClassLayout() {
  const { t } = useTranslation();
  const { classId = '', subjectId = '' } = useParams();
  const iconRef = useRef<BookTextIconHandle>(null);
  const detail = useQuery({
    queryKey: ['teacher-class', classId, subjectId],
    queryFn: () => apiFetch<TeacherClassDetail>(`/teacher/classes/${classId}/subjects/${subjectId}`),
    enabled: Boolean(classId && subjectId),
  });
  const roster = useQuery({
    queryKey: ['teacher-roster', classId, subjectId],
    queryFn: () =>
      apiFetch<TeacherRosterRow[]>(`/teacher/classes/${classId}/subjects/${subjectId}/roster`),
    enabled: Boolean(classId && subjectId),
  });

  usePageTrail(
    detail.data ? [{ label: `${detail.data.subjectName} · ${detail.data.className}` }] : [],
  );

  if (detail.isLoading || roster.isLoading) return <QueryLoading variant="table" />;
  if (detail.isError || roster.isError || !detail.data || !roster.data) {
    return (
      <QueryError
        onRetry={() => {
          void detail.refetch();
          void roster.refetch();
        }}
      />
    );
  }

  const cls = detail.data;
  const base = `/teacher/classes/${classId}/${subjectId}`;
  const lessonCount = cls.units.reduce((sum, unit) => sum + unit.lessons.length, 0);
  const pending = cls.assignments.reduce((sum, item) => sum + item.pendingCount, 0);

  return (
    <div className="space-y-6">
      <Link
        to="/teacher/classes"
        className="inline-flex items-center gap-1 text-sm text-muted no-underline hover:text-accent"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
        {t('nav.classes')}
      </Link>

      <div className="rounded-xl border border-border bg-surface p-4 md:p-5">
        <div className="flex items-start gap-4">
          <span
            className="inline-flex size-14 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent"
            onMouseEnter={() => iconRef.current?.startAnimation()}
            onMouseLeave={() => iconRef.current?.stopAnimation()}
          >
            <BookTextIcon ref={iconRef} size={28} aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight [overflow-wrap:anywhere]">
              {cls.subjectName}
            </h1>
            <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-3">
              <div>
                <dt className="text-xs text-muted">{t('teacher.class')}</dt>
                <dd className="mt-0.5 text-sm font-medium">{cls.className}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">{t('teacher.roomLabel')}</dt>
                <dd className="mt-0.5 text-sm font-medium">{cls.room ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">{t('teacher.tabStudents')}</dt>
                <dd className="mt-0.5 text-sm font-medium tabular-nums">{cls.studentCount}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <PortalNavTabs
        label={t('teacher.tabOverview')}
        items={[
          { to: base, title: t('teacher.tabOverview'), end: true },
          { to: `${base}/students`, title: t('teacher.tabStudents'), count: roster.data.length },
          { to: `${base}/lessons`, title: t('teacher.tabLessons'), count: lessonCount },
          { to: `${base}/assignments`, title: t('teacher.tabAssignments'), count: pending || undefined },
          { to: `${base}/quizzes`, title: t('teacher.tabQuizzes'), count: cls.assessments.length || undefined },
          { to: `${base}/attendance`, title: t('teacher.tabAttendance') },
          { to: `${base}/materials`, title: t('teacher.tabMaterials') },
        ]}
      />

      <Outlet context={{ detail: cls, roster: roster.data }} />
    </div>
  );
}
