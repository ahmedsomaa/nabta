import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '@heroui/react';
import type { AdminOverview } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthProvider';
import { EmptyCard, QueryError, QueryLoading } from '@/features/student/QueryState';
import {
  AdminMetricGrid,
  AdminOverviewFilters,
  AttentionSection,
  Section,
  overviewQueryString,
} from './AdminOverviewWidgets';

export function AdminDashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [academicYearId, setAcademicYearId] = useState('');
  const [gradeId, setGradeId] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [teacherId, setTeacherId] = useState('');

  const school = useQuery({
    queryKey: ['admin-overview'],
    queryFn: () => apiFetch<AdminOverview>('/admin/overview'),
  });

  const params = useMemo(
    () => overviewQueryString({ academicYearId, gradeId, classId, subjectId, teacherId }),
    [academicYearId, gradeId, classId, subjectId, teacherId],
  );

  const academic = useQuery({
    queryKey: ['admin-overview', params],
    queryFn: () => apiFetch<AdminOverview>(`/admin/overview${params}`),
  });

  if (school.isLoading) return <QueryLoading />;
  if (school.isError || !school.data) return <QueryError onRetry={() => void school.refetch()} />;

  const schoolData = school.data;
  const academicData = academic.data ?? schoolData;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('dashboard.adminTitle')}</h1>
          <p className="text-sm text-muted">{user?.schoolName}</p>
        </div>
        <Button variant="secondary" onPress={() => navigate('/admin/reports')}>
          {t('admin.viewReports')}
        </Button>
      </div>

      {schoolData.students === 0 && schoolData.teachers === 0 ? (
        <EmptyCard>{t('admin.emptyStudents')}</EmptyCard>
      ) : null}

      <Section title={t('admin.schoolOverview')}>
        <AdminMetricGrid data={schoolData} clickable />
      </Section>

      <Section title={t('admin.academicOverview')}>
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
        {academic.isLoading && !academic.data ? (
          <QueryLoading />
        ) : academic.isError ? (
          <QueryError onRetry={() => void academic.refetch()} />
        ) : (
          <AdminMetricGrid data={academicData} />
        )}
      </Section>

      <Section title={t('admin.needsAttention')}>
        <AttentionSection data={schoolData} />
      </Section>
    </div>
  );
}
