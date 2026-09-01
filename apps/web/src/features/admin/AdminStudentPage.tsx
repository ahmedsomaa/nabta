import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button, Chip, Input, Label, Modal, TextField, toast } from '@heroui/react';
import type { AdminStudentDetail, SchoolClass } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthProvider';
import { QueryError, QueryLoading } from '@/features/student/QueryState';

export function AdminStudentPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [givenName, setGivenName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [classId, setClassId] = useState('');

  const student = useQuery({
    queryKey: ['admin-student', id],
    queryFn: () => apiFetch<AdminStudentDetail>(`/students/${id}`),
    enabled: Boolean(id),
  });
  const classes = useQuery({
    queryKey: ['admin-classes'],
    queryFn: () => apiFetch<SchoolClass[]>('/classes?limit=100'),
  });

  const save = useMutation({
    mutationFn: () =>
      apiFetch(`/students/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ givenName, familyName }),
      }),
    onSuccess: () => {
      setEditing(false);
      void queryClient.invalidateQueries({ queryKey: ['admin-student', id] });
      void queryClient.invalidateQueries({ queryKey: ['admin-students'] });
      toast.success(t('admin.saved'));
    },
  });
  const status = useMutation({
    mutationFn: (next: 'active' | 'disabled') =>
      apiFetch(`/students/${id}`, { method: 'PATCH', body: JSON.stringify({ status: next }) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-student', id] });
      void queryClient.invalidateQueries({ queryKey: ['admin-students'] });
    },
  });
  const enroll = useMutation({
    mutationFn: () =>
      apiFetch(`/classes/${classId}/enrollments`, {
        method: 'POST',
        body: JSON.stringify({ studentId: id }),
      }),
    onSuccess: () => {
      setClassId('');
      void queryClient.invalidateQueries({ queryKey: ['admin-student', id] });
      void queryClient.invalidateQueries({ queryKey: ['admin-class-enrollments'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-students'] });
    },
  });
  const unenroll = useMutation({
    mutationFn: (enrollmentId: string) => {
      const row = student.data?.enrollments.find((item) => item.id === enrollmentId);
      if (!row) throw new Error('missing');
      return apiFetch(`/classes/${row.classId}/enrollments/${enrollmentId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-student', id] });
      void queryClient.invalidateQueries({ queryKey: ['admin-class-enrollments'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-students'] });
    },
  });

  if (student.isLoading) return <QueryLoading />;
  if (student.isError || !student.data) return <QueryError onRetry={() => void student.refetch()} />;

  const row = student.data;
  const enrolledIds = new Set(row.enrollments.map((item) => item.classId));

  return (
    <div className="space-y-4">
      <Button variant="tertiary" onPress={() => navigate('/admin/users')}>
        {t('admin.back')}
      </Button>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {row.givenName} {row.familyName}
          </h1>
          <p className="text-sm text-muted">{row.email}</p>
          <Chip size="sm" color={row.status === 'active' ? 'success' : 'danger'} variant="soft" className="mt-2">
            {t(`admin.${row.status}`)}
          </Chip>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onPress={() => {
            setGivenName(row.givenName);
            setFamilyName(row.familyName);
            setEditing(true);
          }}>
            {t('admin.edit')}
          </Button>
          {row.userId !== user?.id ? (
          <Modal>
            <Button variant={row.status === 'active' ? 'danger' : 'secondary'}>
              {row.status === 'active' ? t('admin.deactivate') : t('admin.activate')}
            </Button>
            <Modal.Backdrop>
              <Modal.Container>
                <Modal.Dialog>
                  <Modal.Header>
                    <Modal.Heading>
                      {row.status === 'active' ? t('admin.deactivateConfirm') : t('admin.activate')}
                    </Modal.Heading>
                  </Modal.Header>
                  <Modal.Footer>
                    <Button slot="close" variant="tertiary">{t('admin.cancel')}</Button>
                    <Button
                      variant={row.status === 'active' ? 'danger' : 'primary'}
                      onPress={() => status.mutate(row.status === 'active' ? 'disabled' : 'active')}
                    >
                      {row.status === 'active' ? t('admin.deactivate') : t('admin.activate')}
                    </Button>
                  </Modal.Footer>
                </Modal.Dialog>
              </Modal.Container>
            </Modal.Backdrop>
          </Modal>
          ) : null}
        </div>
      </div>

      {editing ? (
        <form
          className="grid gap-3 rounded-xl border border-border p-4 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <TextField name="givenName" value={givenName} onChange={setGivenName}>
            <Label>{t('admin.givenName')}</Label>
            <Input />
          </TextField>
          <TextField name="familyName" value={familyName} onChange={setFamilyName}>
            <Label>{t('admin.familyName')}</Label>
            <Input />
          </TextField>
          <div className="flex gap-2 md:col-span-2">
            <Button type="submit">{t('admin.save')}</Button>
            <Button type="button" variant="tertiary" onPress={() => setEditing(false)}>
              {t('admin.cancel')}
            </Button>
          </div>
        </form>
      ) : null}

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{t('admin.enrollments')}</h2>
        <ul className="space-y-2">
          {row.enrollments.map((enrollment) => (
            <li key={enrollment.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-2">
              <Link to={`/admin/academics/classes/${enrollment.classId}`} className="text-sm no-underline">
                {enrollment.className} · {enrollment.gradeName}
              </Link>
              <Button size="sm" variant="danger" onPress={() => unenroll.mutate(enrollment.id)}>
                {t('admin.unenroll')}
              </Button>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={classId}
            onChange={(event) => setClassId(event.target.value)}
          >
            <option value="">{t('admin.enroll')}</option>
            {(classes.data ?? [])
              .filter((item) => !enrolledIds.has(item.id))
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.gradeName ? ` · ${item.gradeName}` : ''}
                </option>
              ))}
          </select>
          <Button size="sm" isDisabled={!classId} onPress={() => enroll.mutate()}>
            {t('admin.enroll')}
          </Button>
        </div>
      </section>
    </div>
  );
}
