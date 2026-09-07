import { useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Input, Label, TextArea, TextField, toast } from '@heroui/react';
import { Upload, X } from 'lucide-react';
import type { FilePresignResult, StudentAssignmentDetail } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from './QueryState';
import { dueUrgency, formatDue, StatusChip } from './StatusChip';
import { StudentPageHeader, StudentPanel } from './StudentChrome';
import { usePageTrail } from '@/layouts/PageTrail';
import { cn } from '@/lib/cn';
import { AssignmentInstructions, formatBytes } from '@/features/teacher/assignmentShared';

const MAX_BYTES = 10 * 1024 * 1024;

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

function FileRow({
  name,
  size,
  href,
  onRemove,
}: {
  name: string;
  size?: number;
  href?: string | null;
  onRemove?: () => void;
}) {
  const inner = (
    <>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{name}</p>
        {size != null && size > 0 ? (
          <p className="mt-0.5 text-xs tabular-nums text-muted" dir="ltr">
            {formatBytes(size)}
          </p>
        ) : null}
      </div>
      {onRemove ? (
        <button
          type="button"
          className="rounded-md p-1 text-muted hover:text-danger"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRemove();
          }}
        >
          <X className="size-4" />
        </button>
      ) : null}
    </>
  );
  if (!href) {
    return <li className="flex items-start gap-3 px-0 py-2.5 first:pt-0 last:pb-0">{inner}</li>;
  }
  return (
    <li>
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className="flex items-start gap-3 py-2.5 text-inherit no-underline first:pt-0 last:pb-0 hover:text-accent"
      >
        {inner}
      </a>
    </li>
  );
}

function resolveMime(file: File, allowed: Set<string>) {
  if (file.type && allowed.has(file.type)) return file.type;
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
  const [textResponse, setTextResponse] = useState<string | null>(null);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['student-assignment', id],
    queryFn: () => apiFetch<StudentAssignmentDetail>(`/me/assignments/${id}`),
    enabled: Boolean(id),
  });
  usePageTrail(query.data ? [{ label: query.data.title }] : []);

  const assignment = query.data;
  const textValue = textResponse ?? assignment?.textResponse ?? '';
  const linkValue = linkUrl ?? assignment?.linkUrl ?? '';
  const allowed = new Set(assignment?.allowedMimeTypes ?? []);
  const wantsFile = assignment?.submissionType === 'FILE' || assignment?.submissionType === 'MULTIPLE';
  const wantsText = assignment?.submissionType === 'TEXT' || assignment?.submissionType === 'MULTIPLE';
  const wantsLink = assignment?.submissionType === 'LINK' || assignment?.submissionType === 'MULTIPLE';

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
      const mimeType = resolveMime(file, allowed);
      const presign = await apiFetch<FilePresignResult>('/me/files/presign', {
        method: 'POST',
        body: JSON.stringify({
          purpose: 'submission',
          assignmentId: id,
          mimeType,
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
          mimeType,
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

  const saveText = useMutation({
    mutationFn: (body: { textResponse?: string; linkUrl?: string }) =>
      apiFetch<StudentAssignmentDetail>(`/me/assignments/${id}/draft`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: (detail) => void invalidate(detail),
  });

  const removeFile = useMutation({
    mutationFn: (fileId: string) =>
      apiFetch<StudentAssignmentDetail>(`/me/assignments/${id}/files/${fileId}`, { method: 'DELETE' }),
    onSuccess: (detail) => void invalidate(detail),
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
    if (!file || !assignment) return;
    if (file.size > MAX_BYTES) {
      setFormError(t('student.fileTooLarge'));
      return;
    }
    const mimeType = resolveMime(file, allowed);
    if (!mimeType || !allowed.has(mimeType)) {
      setFormError(t('student.fileTypeNotAllowed'));
      return;
    }
    if (assignment.maxFiles > 1 && assignment.files.length >= assignment.maxFiles) {
      setFormError(t('student.maxFilesReached'));
      return;
    }
    setFormError(null);
    upload.mutate(file);
  };

  if (query.isLoading) return <QueryLoading variant="assignment" />;
  if (query.isError || !assignment) return <QueryError onRetry={() => void query.refetch()} />;

  const busy = upload.isPending || submit.isPending || saveText.isPending || removeFile.isPending;
  const urgency = dueUrgency(assignment.dueAt, assignment.status);
  const percent =
    assignment.score != null && assignment.maxScore > 0
      ? Math.round((assignment.score / assignment.maxScore) * 100)
      : null;
  const instructions = assignment.instructions.trim();
  const attachments = assignment.attachments ?? [];
  const hasBrief = Boolean(instructions) || attachments.length > 0;
  const canAddFile = wantsFile && assignment.canSubmit && assignment.files.length < assignment.maxFiles;
  const readyToSubmit =
    assignment.submissionType === 'NONE'
      ? false
      : assignment.submissionType === 'FILE'
        ? assignment.files.length > 0
        : assignment.submissionType === 'TEXT'
          ? Boolean(textValue.trim())
          : assignment.submissionType === 'LINK'
            ? Boolean(linkValue.trim())
            : assignment.files.length > 0 || Boolean(textValue.trim()) || Boolean(linkValue.trim());

  const dueLabel = assignment.dueAt
    ? t('student.due', { date: formatDue(assignment.dueAt, i18n.language) })
    : t('student.noDueDate');

  return (
    <div className="space-y-6">
      <StudentPageHeader
        title={assignment.title}
        subtitle={
          <>
            {t('student.assignmentSubtitle')}
            <span className={cn('mt-1 block', urgency === 'overdue' ? 'text-danger' : undefined)}>
              {assignment.subjectName} · {dueLabel}
            </span>
          </>
        }
        trailing={<StatusChip status={assignment.status} />}
      />

      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="order-1 space-y-4 lg:order-2 lg:sticky lg:top-6">
          {assignment.score != null || assignment.feedback ? (
            <StudentPanel>
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
            </StudentPanel>
          ) : null}

          <StudentPanel>
            <p className="text-xs font-medium text-muted">{t('student.submission')}</p>
            {assignment.submissionType === 'NONE' ? (
              <p className="mt-3 text-sm text-muted">{t('student.noSubmission')}</p>
            ) : (
              <>
                {assignment.files.length > 0 ? (
                  <ul className="mt-3">
                    {assignment.files.map((file) => (
                      <FileRow
                        key={file.id}
                        name={file.fileName}
                        size={file.size}
                        href={file.downloadUrl}
                        onRemove={
                          assignment.canSubmit
                            ? () => removeFile.mutate(file.id)
                            : undefined
                        }
                      />
                    ))}
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
                    {wantsText ? (
                      <TextField
                        name="textResponse"
                        value={textValue}
                        onChange={setTextResponse}
                      >
                        <Label>{t('student.textResponse')}</Label>
                        <TextArea rows={5} />
                      </TextField>
                    ) : null}
                    {wantsLink ? (
                      <TextField name="linkUrl" value={linkValue} onChange={setLinkUrl}>
                        <Label>{t('student.linkSubmission')}</Label>
                        <Input />
                      </TextField>
                    ) : null}
                    {wantsText || wantsLink ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        isPending={saveText.isPending}
                        onPress={() =>
                          saveText.mutate({
                            ...(wantsText ? { textResponse: textValue } : {}),
                            ...(wantsLink ? { linkUrl: linkValue } : {}),
                          })
                        }
                      >
                        {t('student.saveDraft')}
                      </Button>
                    ) : null}
                    {wantsFile ? (
                      <>
                        <input
                          ref={inputRef}
                          type="file"
                          className="sr-only"
                          accept={assignment.allowedMimeTypes.join(',')}
                          onChange={(event) => {
                            onPick(event.target.files?.[0]);
                            event.target.value = '';
                          }}
                        />
                        {canAddFile ? (
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
                                    ? t('student.addAnotherFile')
                                    : t('student.upload')}
                              </span>
                              <span className="text-xs text-muted">{t('student.fileHint')}</span>
                            </button>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                    <Button
                      variant="primary"
                      className="w-full"
                      isPending={submit.isPending}
                      isDisabled={busy || !readyToSubmit}
                      onPress={() => {
                        if (wantsText || wantsLink) {
                          saveText.mutate(
                            {
                              ...(wantsText ? { textResponse: textValue } : {}),
                              ...(wantsLink ? { linkUrl: linkValue } : {}),
                            },
                            { onSuccess: () => submit.mutate() },
                          );
                          return;
                        }
                        submit.mutate();
                      }}
                    >
                      {t('student.submit')}
                    </Button>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted">{t('student.locked')}</p>
                )}
              </>
            )}
          </StudentPanel>
        </div>

        <div className="order-2 lg:order-1">
          <StudentPanel>
            {instructions ? (
              <>
                <p className="text-xs font-medium text-muted">{t('student.instructions')}</p>
                <div className="mt-1">
                  <AssignmentInstructions html={instructions} />
                </div>
              </>
            ) : null}
            {attachments.length > 0 ? (
              <div className={instructions ? 'mt-5 border-t border-border pt-4' : undefined}>
                <p className="text-xs font-medium text-muted">{t('student.attachments')}</p>
                <ul className="mt-1 divide-y divide-border">
                  {attachments.map((file) => (
                    <FileRow
                      key={file.id}
                      name={file.fileName}
                      size={file.size}
                      href={file.url ?? file.downloadUrl}
                    />
                  ))}
                </ul>
              </div>
            ) : null}
            {!hasBrief ? (
              <p className="text-sm text-muted">{t('student.emptyInstructions')}</p>
            ) : null}
          </StudentPanel>
        </div>
      </div>
    </div>
  );
}
