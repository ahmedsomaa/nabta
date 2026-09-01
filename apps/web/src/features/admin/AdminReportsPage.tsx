import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { AdminOverview } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from '@/features/student/QueryState';
import { AdminMetricGrid, AdminOverviewFilters, overviewQueryString } from './AdminOverviewWidgets';

export function AdminReportsPage() {
  const { t } = useTranslation();
  const [academicYearId, setAcademicYearId] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [teacherId, setTeacherId] = useState('');

  const params = useMemo(
    () => overviewQueryString({ academicYearId, gradeId, classId, subjectId, teacherId }),
    [academicYearId, gradeId, classId, subjectId, teacherId],
  );

  const overview = useQuery({
    queryKey: ['admin-overview', params],
    queryFn: () => apiFetch<AdminOverview>(`/admin/overview${params}`),
  });

  if (overview.isLoading && !overview.data) return <QueryLoading />;
  if (overview.isError || !overview.data) {
    return <QueryError onRetry={() => void overview.refetch()} />;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t('nav.reports')}</h1>
      <AdminOverviewFilters
        academicYearId={academicYearId}
        gradeId={gradeId}
        classId={classId}
        subjectId={subjectId}
        teacherId={teacherId}
        onAcademicYearId={setAcademicYearId}
        onGradeId={setGradeId}
        onClassId={setClassId}
        onSubjectId={setSubjectId}
        onTeacherId={setTeacherId}
      />
      <AdminMetricGrid data={overview.data} />
    </div>
  );
}
