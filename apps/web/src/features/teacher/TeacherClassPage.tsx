import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '@heroui/react';
import type { TeacherClassDetail, TeacherRosterRow } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { EmptyCard, QueryError, QueryLoading } from './QueryState';

export function TeacherClassPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { classId = '', subjectId = '' } = useParams();
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

  if (detail.isLoading || roster.isLoading) return <QueryLoading />;
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

  return (
    <div className="space-y-6">
      <Link to="/teacher/classes" className="text-sm text-muted no-underline hover:text-accent">
        {t('nav.classes')}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">
          {cls.className} · {cls.subjectName}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="primary" onPress={() => navigate(`${base}/builder`)}>
            {t('teacher.builder')}
          </Button>
          <Button size="sm" variant="secondary" onPress={() => navigate(`${base}/attendance`)}>
            {t('teacher.attendance')}
          </Button>
          <Button size="sm" variant="secondary" onPress={() => navigate(`/teacher/gradebook/${classId}/${subjectId}`)}>
            {t('teacher.gradebook')}
          </Button>
          <Button size="sm" variant="secondary" onPress={() => navigate('/teacher/assignments/new')}>
            {t('teacher.createAssignment')}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onPress={() =>
              navigate(`/teacher/assessments/new?classId=${classId}&subjectId=${subjectId}`)
            }
          >
            {t('teacher.createQuiz')}
          </Button>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('teacher.roster')}</h2>
        {roster.data.length === 0 ? (
          <EmptyCard>{t('teacher.emptyRoster')}</EmptyCard>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[36rem] text-start text-sm">
              <thead className="bg-surface text-muted">
                <tr>
                  <th className="px-4 py-2 font-medium">{t('teacher.student')}</th>
                  <th className="px-4 py-2 font-medium">{t('teacher.progress')}</th>
                  <th className="px-4 py-2 font-medium">{t('teacher.attendance')}</th>
                  <th className="px-4 py-2 font-medium">{t('teacher.average')}</th>
                  <th className="px-4 py-2 font-medium">{t('teacher.missingWork')}</th>
                </tr>
              </thead>
              <tbody>
                {roster.data.map((row) => (
                  <tr
                    key={row.studentId}
                    className="cursor-pointer border-t border-border hover:bg-overlay"
                    onClick={() => navigate(`${base}/students/${row.studentId}`)}
                  >
                    <td className="px-4 py-3">
                      {row.givenName} {row.familyName}
                    </td>
                    <td className="px-4 py-3">{row.progressPercent}%</td>
                    <td className="px-4 py-3">
                      {row.attendancePercent == null ? t('teacher.noGrade') : `${row.attendancePercent}%`}
                    </td>
                    <td className="px-4 py-3">
                      {row.average == null ? t('teacher.noGrade') : `${row.average}%`}
                    </td>
                    <td className="px-4 py-3">{row.missingWork}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
