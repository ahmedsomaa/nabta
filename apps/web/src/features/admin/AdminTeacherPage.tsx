import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button, Chip, Input, Label, Modal, TextField, toast } from '@heroui/react';
import type { AdminTeacherDetail, SchoolClass, Subject } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthProvider';
import { QueryError, QueryLoading } from '@/features/student/QueryState';

export function AdminTeacherPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [givenName, setGivenName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');

  const teacher = useQuery({
    queryKey: ['admin-teacher', id],
    queryFn: () => apiFetch<AdminTeacherDetail>(`/teachers/${id}`),
    enabled: Boolean(id),
  });
  const classes = useQuery({
    queryKey: ['admin-classes'],
    queryFn: () => apiFetch<SchoolClass[]>('/classes?limit=100'),
  });
  const subjects = useQuery({
    queryKey: ['admin-subjects'],
    queryFn: () => apiFetch<Subject[]>('/subjects?limit=100'),
  });

  const save = useMutation({
    mutationFn: () =>
      apiFetch(`/teachers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ givenName, familyName }),
      }),
    onSuccess: () => {
      setEditing(false);
      void queryClient.invalidateQueries({ queryKey: ['admin-teacher', id] });
      void queryClient.invalidateQueries({ queryKey: ['admin-teachers'] });
      toast.success(t('admin.saved'));
    },
  });
  const status = useMutation({
    mutationFn: (next: 'active' | 'disabled') =>
      apiFetch(`/teachers/${id}`, { method: 'PATCH', body: JSON.stringify({ status: next }) }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-teacher', id] });
      void queryClient.invalidateQueries({ queryKey: ['admin-teachers'] });
    },
  });
  const assign = useMutation({
    mutationFn: () =>
      apiFetch('/teaching-assignments', {
        method: 'POST',
        body: JSON.stringify({ teacherId: id, classId, subjectId }),
      }),
    onSuccess: () => {
      setClassId('');
      setSubjectId('');
      void queryClient.invalidateQueries({ queryKey: ['admin-teacher', id] });
      void queryClient.invalidateQueries({ queryKey: ['admin-class-assignments'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-teachers'] });
    },
  });
  const unassign = useMutation({
    mutationFn: (assignmentId: string) =>
      apiFetch(`/teaching-assignments/${assignmentId}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-teacher', id] });
      void queryClient.invalidateQueries({ queryKey: ['admin-class-assignments'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-teachers'] });
    },
  });

  if (teacher.isLoading) return <QueryLoading />;
  if (teacher.isError || !teacher.data) return <QueryError onRetry={() => void teacher.refetch()} />;

  const row = teacher.data;

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
          <Button
            variant="secondary"
            onPress={() => {
              setGivenName(row.givenName);
              setFamilyName(row.familyName);
              setEditing(true);
            }}
          >
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
        <h2 className="text-lg font-semibold">{t('admin.assignments')}</h2>
        <ul className="space-y-2">
          {row.assignments.map((assignment) => (
            <li key={assignment.id} className="flex items-center justify-between rounded-xl border border-border px-4 py-2">
              <Link to={`/admin/academics/classes/${assignment.classId}`} className="text-sm no-underline">
                {assignment.className} · {assignment.subjectName}
              </Link>
              <Button size="sm" variant="danger" onPress={() => unassign.mutate(assignment.id)}>
                {t('admin.unassign')}
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
            <option value="">{t('admin.classes')}</option>
            {(classes.data ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
            value={subjectId}
            onChange={(event) => setSubjectId(event.target.value)}
          >
            <option value="">{t('admin.subjects')}</option>
            {(subjects.data ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <Button size="sm" isDisabled={!classId || !subjectId} onPress={() => assign.mutate()}>
            {t('admin.assign')}
          </Button>
        </div>
      </section>
    </div>
  );
}
