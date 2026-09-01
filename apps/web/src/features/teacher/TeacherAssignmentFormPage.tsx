import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Input, Label, TextArea, TextField, toast } from '@heroui/react';
import type {
  FilePresignResult,
  TeacherAssignmentDetail,
  TeacherClassItem,
} from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from './QueryState';
import { PortalPageHeader, PortalPanel } from '@/components/portal/PortalChrome';
import { usePageTrail } from '@/layouts/PageTrail';

function toLocalInput(iso: string) {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function TeacherAssignmentFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const inputRef = useRef<HTMLInputElement>(null);

  const classes = useQuery({
    queryKey: ['teacher-classes'],
    queryFn: () => apiFetch<TeacherClassItem[]>('/teacher/classes'),
  });
  const existing = useQuery({
    queryKey: ['teacher-assignment', id],
    queryFn: () => apiFetch<TeacherAssignmentDetail>(`/teacher/assignments/${id}`),
    enabled: !isNew && Boolean(id),
  });

  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [maxScore, setMaxScore] = useState('100');
  const [pair, setPair] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!existing.data) return;
    setTitle(existing.data.title);
    setInstructions(existing.data.instructions);
    setDueAt(toLocalInput(existing.data.dueAt));
    setMaxScore(String(existing.data.maxScore));
    setPair(`${existing.data.classId}:${existing.data.subjectId}`);
  }, [existing.data]);

  useEffect(() => {
    if (isNew && classes.data?.[0] && !pair) {
      setPair(`${classes.data[0].classId}:${classes.data[0].subjectId}`);
    }
  }, [isNew, classes.data, pair]);

  usePageTrail([{ label: isNew ? t('teacher.newAssignment') : (existing.data?.title ?? t('nav.assignments')) }]);

  const save = useMutation({
    mutationFn: async (publish: boolean) => {
      const [classId, subjectId] = pair.split(':');
      const payload = {
        title,
        instructions,
        dueAt: new Date(dueAt).toISOString(),
        maxScore: Number(maxScore),
        classId,
        subjectId,
      };
      const row = isNew
        ? await apiFetch<TeacherAssignmentDetail>('/teacher/assignments', {
            method: 'POST',
            body: JSON.stringify(payload),
          })
        : await apiFetch<TeacherAssignmentDetail>(`/teacher/assignments/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(payload),
          });
      if (publish) {
        return apiFetch<TeacherAssignmentDetail>(`/teacher/assignments/${row.id}/publish`, {
          method: 'POST',
        });
      }
      return row;
    },
    onSuccess: (row) => {
      toast.success(t('teacher.saved'));
      void queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] });
      if (isNew) navigate(`/teacher/assignments/${row.id}`, { replace: true });
    },
    onError: (err: Error) => setError(err.message),
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (isNew || !id) throw new Error('Save the assignment first.');
      const presign = await apiFetch<FilePresignResult>('/teacher/files/presign', {
        method: 'POST',
        body: JSON.stringify({
          purpose: 'assignment',
          assignmentId: id,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          fileName: file.name,
        }),
      });
      const put = await fetch(presign.uploadUrl, { method: 'PUT', body: file });
      if (!put.ok) throw new Error('Upload failed');
      return apiFetch<TeacherAssignmentDetail>(`/teacher/assignments/${id}/files`, {
        method: 'POST',
        body: JSON.stringify({
          storageKey: presign.storageKey,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          fileName: file.name,
        }),
      });
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['teacher-assignment', id] }),
  });

  const unpublish = useMutation({
    mutationFn: () => apiFetch(`/teacher/assignments/${id}/unpublish`, { method: 'POST' }),
    onSuccess: () => {
      toast.success(t('teacher.saved'));
      void queryClient.invalidateQueries({ queryKey: ['teacher-assignment', id] });
    },
  });

  if (classes.isLoading || (!isNew && existing.isLoading)) return <QueryLoading variant="assignment" />;
  if (classes.isError || !classes.data) return <QueryError onRetry={() => void classes.refetch()} />;
  if (!isNew && (existing.isError || !existing.data)) {
    return <QueryError onRetry={() => void existing.refetch()} />;
  }

  const onSubmit = (event: FormEvent, publish: boolean) => {
    event.preventDefault();
    setError(null);
    save.mutate(publish);
  };

  return (
    <form className="space-y-4" onSubmit={(event) => onSubmit(event, false)}>
      <PortalPageHeader title={isNew ? t('teacher.newAssignment') : (existing.data?.title ?? '')} />
      {error ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{error}</Alert.Title>
          </Alert.Content>
        </Alert>
      ) : null}
      <PortalPanel className="space-y-4">
      <label className="grid gap-1 text-sm">
        <span>{t('teacher.classSubject')}</span>
        <select
          className="rounded-lg border border-border bg-background px-3 py-2"
          value={pair}
          disabled={!isNew}
          onChange={(event) => setPair(event.target.value)}
        >
          {classes.data.map((item) => (
            <option key={`${item.classId}-${item.subjectId}`} value={`${item.classId}:${item.subjectId}`}>
              {item.className} · {item.subjectName}
            </option>
          ))}
        </select>
      </label>
      <TextField name="title" isRequired value={title} onChange={setTitle}>
        <Label>{t('teacher.title')}</Label>
        <Input />
      </TextField>
      <TextField name="instructions" isRequired value={instructions} onChange={setInstructions}>
        <Label>{t('teacher.instructions')}</Label>
        <TextArea rows={6} />
      </TextField>
      <label className="grid gap-1 text-sm">
        <span>{t('teacher.dueDate')}</span>
        <input
          type="datetime-local"
          required
          className="rounded-lg border border-border bg-background px-3 py-2"
          value={dueAt}
          onChange={(event) => setDueAt(event.target.value)}
        />
      </label>
      <TextField name="maxScore" value={maxScore} onChange={setMaxScore}>
        <Label>{t('teacher.maxScore')}</Label>
        <Input type="number" min={1} />
      </TextField>

      {!isNew ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">{t('teacher.attachments')}</p>
          {(existing.data?.files ?? []).map((file) => (
            <p key={file.id} className="text-sm text-muted">
              {file.fileName}
            </p>
          ))}
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) upload.mutate(file);
              event.target.value = '';
            }}
          />
          <Button type="button" variant="secondary" size="sm" onPress={() => inputRef.current?.click()}>
            {t('teacher.addMaterial')}
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="secondary" isPending={save.isPending}>
          {t('teacher.saveDraft')}
        </Button>
        <Button
          type="button"
          variant="primary"
          isPending={save.isPending}
          onPress={() => save.mutate(true)}
        >
          {t('teacher.publish')}
        </Button>
        {!isNew && existing.data?.publishedAt ? (
          <Button type="button" variant="tertiary" onPress={() => unpublish.mutate()}>
            {t('teacher.unpublish')}
          </Button>
        ) : null}
      </div>
      </PortalPanel>
    </form>
  );
}
