import { FormEvent, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button, Chip, Input, Label, TextField } from '@heroui/react';
import type { AdminStudentListItem, AdminTeacherListItem } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { EmptyCard, QueryError, QueryLoading } from '@/features/student/QueryState';

export function AdminUsersPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'students' | 'teachers'>('students');
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t('nav.users')}</h1>
      <div className="flex gap-2">
        <Button size="sm" variant={tab === 'students' ? 'primary' : 'secondary'} onPress={() => setTab('students')}>
          {t('admin.students')}
        </Button>
        <Button size="sm" variant={tab === 'teachers' ? 'primary' : 'secondary'} onPress={() => setTab('teachers')}>
          {t('admin.teachers')}
        </Button>
      </div>
      {tab === 'students' ? <StudentsPanel /> : <TeachersPanel />}
    </div>
  );
}

function StudentsPanel() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const list = useQuery({
    queryKey: ['admin-students', q],
    queryFn: () =>
      apiFetch<AdminStudentListItem[]>(`/students?limit=100${q.trim().length >= 2 ? `&q=${encodeURIComponent(q.trim())}` : ''}`),
  });
  const create = useMutation({
    mutationFn: (body: { email: string; password: string; givenName: string; familyName: string }) =>
      apiFetch<AdminStudentListItem>('/students', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['admin-students'] });
    },
  });

  if (list.isLoading) return <QueryLoading />;
  if (list.isError || !list.data) return <QueryError onRetry={() => void list.refetch()} />;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <TextField className="min-w-48 flex-1" name="q" value={q} onChange={setQ}>
          <Label>{t('admin.search')}</Label>
          <Input />
        </TextField>
        <Button onPress={() => setOpen((value) => !value)}>{t('admin.createStudent')}</Button>
      </div>
      {open ? (
        <PersonForm
          includePassword
          onCancel={() => setOpen(false)}
          onSubmit={(values) => create.mutate(values)}
          pending={create.isPending}
          error={create.error instanceof Error ? create.error.message : null}
        />
      ) : null}
      {list.data.length === 0 ? (
        <EmptyCard>{t('admin.emptyStudents')}</EmptyCard>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[640px] text-start text-sm">
            <thead className="bg-overlay text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">{t('admin.students')}</th>
                <th className="px-3 py-2 font-medium">{t('admin.class')}</th>
                <th className="px-3 py-2 font-medium">{t('admin.grade')}</th>
                <th className="px-3 py-2 font-medium">{t('admin.attendance')}</th>
                <th className="px-3 py-2 font-medium">{t('admin.average')}</th>
                <th className="px-3 py-2 font-medium">{t('admin.status')}</th>
              </tr>
            </thead>
            <tbody>
              {list.data.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer border-t border-border hover:bg-overlay"
                  onClick={() => navigate(`/admin/users/students/${row.id}`)}
                >
                  <td className="px-3 py-2">
                    {row.givenName} {row.familyName}
                    <span className="block text-xs text-muted">{row.email}</span>
                  </td>
                  <td className="px-3 py-2">{row.className ?? '—'}</td>
                  <td className="px-3 py-2">{row.gradeName ?? '—'}</td>
                  <td className="px-3 py-2">{row.attendancePercent == null ? '—' : `${row.attendancePercent}%`}</td>
                  <td className="px-3 py-2">{row.average == null ? '—' : `${row.average}%`}</td>
                  <td className="px-3 py-2">
                    <Chip size="sm" color={row.status === 'active' ? 'success' : 'danger'} variant="soft">
                      {t(`admin.${row.status}`)}
                    </Chip>
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

function TeachersPanel() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const list = useQuery({
    queryKey: ['admin-teachers', q],
    queryFn: () =>
      apiFetch<AdminTeacherListItem[]>(`/teachers?limit=100${q.trim().length >= 2 ? `&q=${encodeURIComponent(q.trim())}` : ''}`),
  });
  const create = useMutation({
    mutationFn: (body: { email: string; password: string; givenName: string; familyName: string }) =>
      apiFetch<AdminTeacherListItem>('/teachers', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['admin-teachers'] });
    },
  });

  if (list.isLoading) return <QueryLoading />;
  if (list.isError || !list.data) return <QueryError onRetry={() => void list.refetch()} />;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <TextField className="min-w-48 flex-1" name="q" value={q} onChange={setQ}>
          <Label>{t('admin.search')}</Label>
          <Input />
        </TextField>
        <Button onPress={() => setOpen((value) => !value)}>{t('admin.createTeacher')}</Button>
      </div>
      {open ? (
        <PersonForm
          includePassword
          onCancel={() => setOpen(false)}
          onSubmit={(values) => create.mutate(values)}
          pending={create.isPending}
          error={create.error instanceof Error ? create.error.message : null}
        />
      ) : null}
      {list.data.length === 0 ? (
        <EmptyCard>{t('admin.emptyTeachers')}</EmptyCard>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[640px] text-start text-sm">
            <thead className="bg-overlay text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">{t('admin.teachers')}</th>
                <th className="px-3 py-2 font-medium">{t('admin.classes')}</th>
                <th className="px-3 py-2 font-medium">{t('admin.subjects')}</th>
                <th className="px-3 py-2 font-medium">{t('admin.status')}</th>
              </tr>
            </thead>
            <tbody>
              {list.data.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer border-t border-border hover:bg-overlay"
                  onClick={() => navigate(`/admin/users/teachers/${row.id}`)}
                >
                  <td className="px-3 py-2">
                    {row.givenName} {row.familyName}
                    <span className="block text-xs text-muted">{row.email}</span>
                  </td>
                  <td className="px-3 py-2">{row.classes.join(', ') || '—'}</td>
                  <td className="px-3 py-2">{row.subjects.join(', ') || '—'}</td>
                  <td className="px-3 py-2">
                    <Chip size="sm" color={row.status === 'active' ? 'success' : 'danger'} variant="soft">
                      {t(`admin.${row.status}`)}
                    </Chip>
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

function PersonForm({
  includePassword,
  givenName,
  familyName,
  onCancel,
  onSubmit,
  pending,
  error,
}: {
  includePassword?: boolean;
  givenName?: string;
  familyName?: string;
  onCancel: () => void;
  onSubmit: (values: { email: string; password: string; givenName: string; familyName: string }) => void;
  pending: boolean;
  error?: string | null;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    email: '',
    password: '',
    givenName: givenName ?? '',
    familyName: familyName ?? '',
  });
  const canSubmit = useMemo(() => {
    if (!form.givenName.trim() || !form.familyName.trim()) return false;
    if (includePassword && (!form.email.trim() || form.password.length < 8)) return false;
    return true;
  }, [form, includePassword]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    onSubmit(form);
  };

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-border p-4 md:grid-cols-2">
      <TextField name="givenName" value={form.givenName} onChange={(value) => setForm({ ...form, givenName: value })}>
        <Label>{t('admin.givenName')}</Label>
        <Input />
      </TextField>
      <TextField name="familyName" value={form.familyName} onChange={(value) => setForm({ ...form, familyName: value })}>
        <Label>{t('admin.familyName')}</Label>
        <Input />
      </TextField>
      {includePassword ? (
        <>
          <TextField name="email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })}>
            <Label>{t('admin.email')}</Label>
            <Input />
          </TextField>
          <TextField
            name="password"
            type="password"
            value={form.password}
            onChange={(value) => setForm({ ...form, password: value })}
          >
            <Label>{t('admin.password')}</Label>
            <Input />
          </TextField>
        </>
      ) : null}
      {error ? <p className="text-sm text-danger md:col-span-2">{error}</p> : null}
      <div className="flex gap-2 md:col-span-2">
        <Button type="submit" isDisabled={!canSubmit || pending}>
          {t('admin.save')}
        </Button>
        <Button type="button" variant="tertiary" onPress={onCancel}>
          {t('admin.cancel')}
        </Button>
      </div>
    </form>
  );
}
