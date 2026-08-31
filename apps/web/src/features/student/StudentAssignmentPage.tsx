import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Card, toast } from '@heroui/react';
import type { FilePresignResult, StudentAssignmentDetail } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from './QueryState';
import { StatusChip, formatDue } from './StatusChip';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  txt: 'text/plain',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

function resolveMime(file: File) {
  if (file.type && ALLOWED.has(file.type)) return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXT[ext] ?? file.type;
}

export function StudentAssignmentPage() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { id = '' } = useParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['student-assignment', id],
    queryFn: () => apiFetch<StudentAssignmentDetail>(`/me/assignments/${id}`),
    enabled: Boolean(id),
  });

  const invalidate = async (detail?: StudentAssignmentDetail) => {
    if (detail) queryClient.setQueryData(['student-assignment', id], detail);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['student-assignment', id] }),
      queryClient.invalidateQueries({ queryKey: ['student-assignments'] }),
      queryClient.invalidateQueries({ queryKey: ['student-dashboard'] }),
    ]);
  };

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const presign = await apiFetch<FilePresignResult>('/me/files/presign', {
        method: 'POST',
        body: JSON.stringify({
          purpose: 'submission',
          assignmentId: id,
          mimeType: resolveMime(file),
          size: file.size,
          fileName: file.name,
        }),
      });
      const put = await fetch(presign.uploadUrl, { method: 'PUT', body: file });
      if (!put.ok) throw new Error('Upload failed');
      return apiFetch<StudentAssignmentDetail>(`/me/assignments/${id}/draft`, {
        method: 'POST',
        body: JSON.stringify({
          storageKey: presign.storageKey,
          mimeType: resolveMime(file),
          size: file.size,
          fileName: file.name,
        }),
      });
    },
    onSuccess: (detail) => {
      setFormError(null);
      void invalidate(detail);
    },
  });

  const submit = useMutation({
    mutationFn: () =>
      apiFetch<StudentAssignmentDetail>(`/me/assignments/${id}/submit`, { method: 'POST' }),
    onSuccess: (detail) => {
      toast.success(t('student.submittedSuccess'));
      void invalidate(detail);
    },
  });

  const onPick = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setFormError(t('student.fileTooLarge'));
      return;
    }
    const mimeType = resolveMime(file);
    if (!mimeType || !ALLOWED.has(mimeType)) {
      setFormError(t('student.fileTypeNotAllowed'));
      return;
    }
    setFormError(null);
    upload.mutate(file);
  };

  if (query.isLoading) return <QueryLoading />;
  if (query.isError || !query.data) return <QueryError onRetry={() => void query.refetch()} />;

  const assignment = query.data;
  const busy = upload.isPending || submit.isPending;

  return (
    <div className="space-y-4">
      <Link to="/student/assignments" className="text-sm text-muted no-underline hover:text-accent">
        {t('nav.assignments')}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{assignment.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {assignment.subjectName} · {t('student.due', { date: formatDue(assignment.dueAt, i18n.language) })}
          </p>
        </div>
        <StatusChip status={assignment.status} />
      </div>

      <Card className="p-5">
        <Card.Header>
          <Card.Title>{t('student.instructions')}</Card.Title>
          <Card.Description className="whitespace-pre-wrap text-foreground">
            {assignment.instructions}
          </Card.Description>
        </Card.Header>
      </Card>

      {assignment.files[0] ? (
        <p className="text-sm text-muted">{t('student.currentFile', { name: assignment.files[0].fileName })}</p>
      ) : null}

      {formError || upload.isError || submit.isError ? (
        <Alert status="danger">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>
              {formError ?? (upload.isError || submit.isError ? t('errors.generic') : '')}
            </Alert.Title>
          </Alert.Content>
        </Alert>
      ) : null}

      {assignment.canSubmit ? (
        <div className="space-y-3">
          <p className="text-sm text-muted">{t('student.fileHint')}</p>
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.doc,.docx,application/pdf,image/jpeg,image/png,image/webp,text/plain"
            onChange={(event) => {
              onPick(event.target.files?.[0]);
              event.target.value = '';
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              isPending={upload.isPending}
              isDisabled={busy}
              onPress={() => inputRef.current?.click()}
            >
              {assignment.files.length > 0 ? t('student.replace') : t('student.upload')}
            </Button>
            <Button
              variant="primary"
              isPending={submit.isPending}
              isDisabled={busy || assignment.files.length === 0}
              onPress={() => submit.mutate()}
            >
              {t('student.submit')}
            </Button>
          </div>
        </div>
      ) : (
        <Alert status="success">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t('student.locked')}</Alert.Title>
          </Alert.Content>
        </Alert>
      )}
    </div>
  );
}
