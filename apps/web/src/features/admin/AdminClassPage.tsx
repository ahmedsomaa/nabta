import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '@heroui/react';
import type { AdminStudentListItem, AdminTeacherListItem, SchoolClass, Subject } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from '@/features/student/QueryState';

type EnrollmentRow = {
  id: string;
  studentId: string;
  student: { id: string; givenName: string; familyName: string };
};
type AssignmentRow = {
  id: string;
  teacherId: string;
  subjectId: string;
  teacher: { givenName: string; familyName: string };
  subject: { name: string };
};

export function AdminClassPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [studentId, setStudentId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [subjectId, setSubjectId] = useState('');

  const schoolClass = useQuery({
    queryKey: ['admin-class', id],
    queryFn: () => apiFetch<SchoolClass>(`/classes/${id}`),
    enabled: Boolean(id),
  });
  const enrollments = useQuery({
    queryKey: ['admin-class-enrollments', id],
    queryFn: () => apiFetch<EnrollmentRow[]>(`/classes/${id}/enrollments`),
    enabled: Boolean(id),
  });
  const assignments = useQuery({
    queryKey: ['admin-class-assignments', id],
    queryFn: () => apiFetch<AssignmentRow[]>(`/classes/${id}/teaching-assignments`),
    enabled: Boolean(id),
  });
  const students = useQuery({
    queryKey: ['admin-students', ''],
    queryFn: () => apiFetch<AdminStudentListItem[]>('/students?limit=100'),
  });
  const teachers = useQuery({
    queryKey: ['admin-teachers', ''],
    queryFn: () => apiFetch<AdminTeacherListItem[]>('/teachers?limit=100'),
  });
  const subjects = useQuery({
    queryKey: ['admin-subjects'],
    queryFn: () => apiFetch<Subject[]>('/subjects?limit=100'),
  });

  const enroll = useMutation({
    mutationFn: () =>
      apiFetch(`/classes/${id}/enrollments`, {
        method: 'POST',
        body: JSON.stringify({ studentId }),
      }),
    onSuccess: () => {
      setStudentId('');
      void queryClient.invalidateQueries({ queryKey: ['admin-class-enrollments', id] });
      void queryClient.invalidateQueries({ queryKey: ['admin-students'] });
    },
  });
  const unenroll = useMutation({
    mutationFn: (enrollmentId: string) =>
      apiFetch(`/classes/${id}/enrollments/${enrollmentId}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-class-enrollments', id] });
      void queryClient.invalidateQueries({ queryKey: ['admin-students'] });
    },
  });
  const assign = useMutation({
    mutationFn: () =>
      apiFetch('/teaching-assignments', {
        method: 'POST',
        body: JSON.stringify({ teacherId, classId: id, subjectId }),
      }),
    onSuccess: () => {
      setTeacherId('');
      setSubjectId('');
      void queryClient.invalidateQueries({ queryKey: ['admin-class-assignments', id] });
      void queryClient.invalidateQueries({ queryKey: ['admin-teachers'] });
    },
  });
  const unassign = useMutation({
    mutationFn: (assignmentId: string) =>
      apiFetch(`/teaching-assignments/${assignmentId}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-class-assignments', id] });
      void queryClient.invalidateQueries({ queryKey: ['admin-teachers'] });
    },
  });

  if (schoolClass.isLoading || enrollments.isLoading || assignments.isLoading) return <QueryLoading />;
  if (schoolClass.isError || !schoolClass.data) {
    return <QueryError onRetry={() => void schoolClass.refetch()} />;
  }

  const enrolled = new Set((enrollments.data ?? []).map((row) => row.studentId));

  return (
    <div className="space-y-6">
      <Button variant="tertiary" onPress={() => navigate('/admin/academics')}>
        {t('admin.back')}
      </Button>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{schoolClass.data.name}</h1>
        <p className="text-sm text-muted">{schoolClass.data.gradeName}</p>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t('admin.roster')}</h2>
        <ul className="space-y-2">
          {(enrollments.data ?? []).map((row) => (
            <li key={row.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-2">
              <Link to={`/admin/users/students/${row.student.id}`} className="text-sm no-underline">
                {row.student.givenName} {row.student.familyName}
              </Link>
              <Button size="sm" variant="danger" onPress={() => unenroll.mutate(row.id)}>
                {t('admin.unenroll')}
              </Button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
          >
            <option value="">{t('admin.enroll')}</option>
            {(students.data ?? [])
              .filter((row) => !enrolled.has(row.id))
              .map((row) => (
                <option key={row.id} value={row.id}>
                  {row.givenName} {row.familyName}
                </option>
              ))}
          </select>
          <Button size="sm" isDisabled={!studentId} onPress={() => enroll.mutate()}>
            {t('admin.enroll')}
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t('admin.assignments')}</h2>
        <ul className="space-y-2">
          {(assignments.data ?? []).map((row) => (
            <li key={row.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-2">
              <Link to={`/admin/users/teachers/${row.teacherId}`} className="text-sm no-underline">
                {row.teacher.givenName} {row.teacher.familyName} · {row.subject.name}
              </Link>
              <Button size="sm" variant="danger" onPress={() => unassign.mutate(row.id)}>
                {t('admin.unassign')}
              </Button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={teacherId}
            onChange={(event) => setTeacherId(event.target.value)}
          >
            <option value="">{t('admin.teachers')}</option>
            {(teachers.data ?? []).map((row) => (
              <option key={row.id} value={row.id}>
                {row.givenName} {row.familyName}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
          >
            <option value="">{t('admin.subjects')}</option>
            {(subjects.data ?? []).map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>
          <Button size="sm" isDisabled={!teacherId || !subjectId} onPress={() => assign.mutate()}>
            {t('admin.assign')}
          </Button>
        </div>
      </section>
    </div>
  );
}
