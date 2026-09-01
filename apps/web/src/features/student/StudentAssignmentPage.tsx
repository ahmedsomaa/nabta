import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Card, toast } from '@heroui/react';
import { File as FileIcon, Image, Upload } from 'lucide-react';
import type { FilePresignResult, StudentAssignmentDetail } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from './QueryState';
import { dueUrgency, formatDue, StatusChip } from './StatusChip';
import { StudentPageHeader } from './StudentChrome';
import { usePageTrail } from '@/layouts/PageTrail';
import { cn } from '@/lib/cn';

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

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) {
    const kb = size / 1024;
    return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  }
  const mb = size / (1024 * 1024);
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

function FileRow({ name, mimeType, size }: { name: string; mimeType: string; size?: number }) {
  const Icon = mimeType.startsWith('image/') ? Image : FileIcon;
  return (
    <li className="flex items-center gap-2 text-sm">
      <Icon className="size-4 shrink-0 text-accent" aria-hidden />
      <span className="min-w-0 truncate">{name}</span>
      {size != null ? (
        <span className="ms-auto shrink-0 text-xs tabular-nums text-muted" dir="ltr">
          {formatBytes(size)}
        </span>
      ) : null}
    </li>
  );
}

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
  const [dragging, setDragging] = useState(false);

  const query = useQuery({
    queryKey: ['student-assignment', id],
    queryFn: () => apiFetch<StudentAssignmentDetail>(`/me/assignments/${id}`),
    enabled: Boolean(id),
  });
  usePageTrail(query.data ? [{ label: query.data.title }] : []);

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

  if (query.isLoading) return <QueryLoading variant="assignment" />;
  if (query.isError || !query.data) return <QueryError onRetry={() => void query.refetch()} />;

  const assignment = query.data;
  const busy = upload.isPending || submit.isPending;
  const urgency = dueUrgency(assignment.dueAt, assignment.status);
  const currentFile = assignment.files[0];
  const percent =
    assignment.score != null && assignment.maxScore > 0
      ? Math.round((assignment.score / assignment.maxScore) * 100)
      : null;

  return (
    <div className="space-y-6">
      <StudentPageHeader
        title={assignment.title}
        subtitle={
          <span className={urgency === 'overdue' ? 'text-danger' : undefined}>
            {assignment.subjectName} · {t('student.due', { date: formatDue(assignment.dueAt, i18n.language) })}
          </span>
        }
        trailing={<StatusChip status={assignment.status} />}
      />

      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="order-1 space-y-4 lg:order-2 lg:sticky lg:top-6">
          {assignment.score != null || assignment.feedback ? (
            <Card className="p-5">
              <p className="text-xs font-medium text-muted">{t('student.feedback')}</p>
              {assignment.score != null ? (
                <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums" dir="ltr">
                  {assignment.score} / {assignment.maxScore}
                </p>
              ) : null}
              {percent != null ? <p className="text-sm text-muted">{percent}%</p> : null}
              {assignment.feedback ? (
                <p className="mt-3 whitespace-pre-wrap text-sm">{assignment.feedback}</p>
              ) : null}
            </Card>
          ) : null}

          <Card className="p-5">
            <Card.Header>
              <div className="flex w-full items-start justify-between gap-2">
                <Card.Title>{t('student.submission')}</Card.Title>
                <StatusChip status={assignment.status} />
              </div>
            </Card.Header>
            {currentFile ? (
              <ul className="mt-3">
                <FileRow
                  name={currentFile.fileName}
                  mimeType={currentFile.mimeType}
                  size={currentFile.size}
                />
              </ul>
            ) : null}

            {formError || upload.isError || submit.isError ? (
              <Alert className="mt-3" status="danger">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Title>
                    {formError ?? (upload.isError || submit.isError ? t('errors.generic') : '')}
                  </Alert.Title>
                </Alert.Content>
              </Alert>
            ) : null}

            {assignment.canSubmit ? (
              <div className="mt-4 space-y-3">
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
                <div
                  className={cn(
                    'rounded-xl border border-dashed border-border',
                    dragging && 'border-accent bg-accent/10',
                  )}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    onPick(event.dataTransfer.files[0]);
                  }}
                >
                  <button
                    type="button"
                    className="flex w-full flex-col items-center gap-2 px-4 py-8 text-center transition-colors hover:bg-overlay"
                    disabled={busy}
                    onClick={() => inputRef.current?.click()}
                  >
                    <Upload className="size-6 text-accent" aria-hidden />
                    <span className="text-sm font-medium">
                      {busy && upload.isPending
                        ? t('student.uploading')
                        : assignment.files.length > 0
                          ? t('student.replace')
                          : t('student.upload')}
                    </span>
                    <span className="text-xs text-muted">{t('student.fileHint')}</span>
                  </button>
                </div>
                <Button
                  variant="primary"
                  className="w-full"
                  isPending={submit.isPending}
                  isDisabled={busy || assignment.files.length === 0}
                  onPress={() => submit.mutate()}
                >
                  {t('student.submit')}
                </Button>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">{t('student.locked')}</p>
            )}
          </Card>
        </div>

        <div className="order-2 space-y-4 lg:order-1">
          <Card className="p-5">
            <Card.Header>
              <Card.Title>{t('student.instructions')}</Card.Title>
              <Card.Description className="whitespace-pre-wrap text-foreground">
                {assignment.instructions}
              </Card.Description>
            </Card.Header>
          </Card>
          {assignment.attachments?.length ? (
            <Card className="p-5">
              <Card.Header>
                <Card.Title>{t('student.attachments')}</Card.Title>
              </Card.Header>
              <ul className="mt-3 space-y-2">
                {assignment.attachments.map((file) => (
                  <FileRow
                    key={file.id}
                    name={file.fileName}
                    mimeType={file.mimeType}
                    size={file.size}
                  />
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
