import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, Label } from '@heroui/react';
import type {
  AcademicYear,
  AdminOverview,
  AdminTeacherListItem,
  Grade,
  SchoolClass,
  Subject,
} from '@nabta/types';
import { apiFetch } from '@/lib/api';

export function formatPercent(value: number | null) {
  return value == null ? '—' : `${value}%`;
}

export function overviewQueryString(filters: {
  academicYearId: string;
  gradeId: string;
  classId: string;
  subjectId: string;
  teacherId: string;
}) {
  const search = new URLSearchParams();
  if (filters.academicYearId) search.set('academicYearId', filters.academicYearId);
  if (filters.gradeId) search.set('gradeId', filters.gradeId);
  if (filters.classId) search.set('classId', filters.classId);
  if (filters.subjectId) search.set('subjectId', filters.subjectId);
  if (filters.teacherId) search.set('teacherId', filters.teacherId);
  const q = search.toString();
  return q ? `?${q}` : '';
}

export function AdminMetric({
  label,
  value,
  to,
}: {
  label: string;
  value: string;
  to?: string;
}) {
  const navigate = useNavigate();
  const card = (
    <Card className={`h-full p-4${to ? ' transition-colors hover:border-accent/40' : ''}`}>
      <Card.Header>
        <Card.Description>{label}</Card.Description>
        <Card.Title className="text-2xl">{value}</Card.Title>
      </Card.Header>
    </Card>
  );
  if (!to) return card;
  return (
    <button type="button" className="rounded-xl text-start" onClick={() => navigate(to)}>
      {card}
    </button>
  );
}

export function AdminMetricGrid({
  data,
  clickable,
}: {
  data: AdminOverview;
  clickable?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminMetric
          label={t('admin.metricStudents')}
          value={String(data.students)}
          to={clickable ? '/admin/users' : undefined}
        />
        <AdminMetric
          label={t('admin.metricTeachers')}
          value={String(data.teachers)}
          to={clickable ? '/admin/users' : undefined}
        />
        <AdminMetric
          label={t('admin.metricClasses')}
          value={String(data.classes)}
          to={clickable ? '/admin/academics' : undefined}
        />
        <AdminMetric
          label={t('admin.metricSubjects')}
          value={String(data.subjects)}
          to={clickable ? '/admin/academics' : undefined}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminMetric
          label={t('admin.metricCourses')}
          value={String(data.activeCourses)}
          to={clickable ? '/admin/academics' : undefined}
        />
        <AdminMetric
          label={t('admin.metricAttendance')}
          value={formatPercent(data.attendancePercent)}
          to={clickable ? '/admin/reports' : undefined}
        />
        <AdminMetric
          label={t('admin.metricCompletion')}
          value={formatPercent(data.assignmentCompletionPercent)}
          to={clickable ? '/admin/reports' : undefined}
        />
        <AdminMetric
          label={t('admin.metricPerformance')}
          value={formatPercent(data.performancePercent)}
          to={clickable ? '/admin/reports' : undefined}
        />
      </div>
    </div>
  );
}

export function AdminOverviewFilters({
  academicYearId,
  gradeId,
  classId,
  subjectId,
  teacherId,
  onAcademicYearId,
  onGradeId,
  onClassId,
  onSubjectId,
  onTeacherId,
}: {
  academicYearId: string;
  gradeId: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  onAcademicYearId: (value: string) => void;
  onGradeId: (value: string) => void;
  onClassId: (value: string) => void;
  onSubjectId: (value: string) => void;
  onTeacherId: (value: string) => void;
}) {
  const { t } = useTranslation();
  const years = useQuery({
    queryKey: ['admin-years'],
    queryFn: () => apiFetch<AcademicYear[]>('/academic-years?limit=100'),
  });
  const grades = useQuery({
    queryKey: ['admin-grades'],
    queryFn: () => apiFetch<Grade[]>('/grades?limit=100'),
  });
  const classes = useQuery({
    queryKey: ['admin-classes'],
    queryFn: () => apiFetch<SchoolClass[]>('/classes?limit=100'),
  });
  const subjects = useQuery({
    queryKey: ['admin-subjects'],
    queryFn: () => apiFetch<Subject[]>('/subjects?limit=100'),
  });
  const teachers = useQuery({
    queryKey: ['admin-teachers', ''],
    queryFn: () => apiFetch<AdminTeacherListItem[]>('/teachers?limit=100'),
  });

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <Filter
        label={t('admin.year')}
        value={academicYearId}
        onChange={onAcademicYearId}
        empty={t('admin.allYears')}
        options={(years.data ?? []).map((row) => ({ id: row.id, label: row.name }))}
      />
      <Filter
        label={t('admin.grade')}
        value={gradeId}
        onChange={onGradeId}
        empty={t('admin.allGrades')}
        options={(grades.data ?? []).map((row) => ({ id: row.id, label: row.name }))}
      />
      <Filter
        label={t('admin.class')}
        value={classId}
        onChange={onClassId}
        empty={t('admin.allClasses')}
        options={(classes.data ?? []).map((row) => ({ id: row.id, label: row.name }))}
      />
      <Filter
        label={t('admin.subjects')}
        value={subjectId}
        onChange={onSubjectId}
        empty={t('admin.allSubjects')}
        options={(subjects.data ?? []).map((row) => ({ id: row.id, label: row.name }))}
      />
      <Filter
        label={t('admin.teachers')}
        value={teacherId}
        onChange={onTeacherId}
        empty={t('admin.allTeachers')}
        options={(teachers.data ?? []).map((row) => ({
          id: row.id,
          label: `${row.givenName} ${row.familyName}`,
        }))}
      />
    </div>
  );
}

function Filter({
  label,
  value,
  onChange,
  empty,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  empty: string;
  options: { id: string; label: string }[];
}) {
  return (
    <label className="grid gap-1 text-sm">
      <Label>{label}</Label>
      <select
        className="rounded-lg border border-border bg-background px-3 py-2"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{empty}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function AttentionList({
  title,
  empty,
  group,
}: {
  title: string;
  empty: string;
  group: AdminOverview['attention']['unenrolledStudents'];
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <Card className="p-4">
      <Card.Header>
        <Card.Title>{title}</Card.Title>
        <Card.Description>
          {group.count === 0 ? empty : t('admin.attentionCount', { count: group.count })}
        </Card.Description>
      </Card.Header>
      {group.items.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {group.items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="w-full rounded-lg px-2 py-1.5 text-start text-sm hover:bg-overlay"
                onClick={() => navigate(item.href)}
              >
                {item.title}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}

export function AttentionSection({ data }: { data: AdminOverview }) {
  const { t } = useTranslation();
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <AttentionList
        title={t('admin.unenrolledStudents')}
        empty={t('admin.emptyUnenrolled')}
        group={data.attention.unenrolledStudents}
      />
      <AttentionList
        title={t('admin.classesWithoutTeacher')}
        empty={t('admin.emptyClassesNoTeacher')}
        group={data.attention.classesWithoutTeacher}
      />
      <AttentionList
        title={t('admin.teachersWithoutAssignment')}
        empty={t('admin.emptyTeachersNoAssignment')}
        group={data.attention.teachersWithoutAssignment}
      />
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
