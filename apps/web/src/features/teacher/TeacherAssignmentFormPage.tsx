import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Key } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Checkbox,
  Chip,
  Dropdown,
  Input,
  Label,
  ListBox,
  Modal,
  Radio,
  RadioGroup,
  Select,
  TextField,
  toast,
} from '@heroui/react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  MoreHorizontal,
  Paperclip,
  Settings2,
} from 'lucide-react';
import type {
  AssignmentResubmitPolicy,
  AssignmentSubmissionType,
  FilePresignResult,
  TeacherAssignmentDetail,
  TeacherAssignmentFile,
  TeacherClassItem,
} from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from './QueryState';
import { usePageTrail } from '@/layouts/PageTrail';
import { formatDue } from '@/features/student/StatusChip';
import { cn } from '@/lib/cn';
import { AssignmentRichTextEditor } from './AssignmentRichTextEditor';
import {
  AssignmentInstructions,
  DEFAULT_ALLOWED_MIME_TYPES,
  SUBMISSION_MIME_OPTIONS,
  UNTITLED_ASSIGNMENT_TITLE,
  attachmentIcon,
  formatBytes,
  fromDateAndTime,
  mimeShortLabel,
  stripAssignmentHtml,
  toDateInput,
  toTimeInput,
} from './assignmentShared';

const TEACHER_ACCEPT =
  '.pdf,.jpg,.jpeg,.png,.webp,.txt,.doc,.docx,.ppt,.pptx,.mp4,.webm,application/pdf,image/jpeg,image/png,image/webp,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,video/mp4,video/webm';

const SUBMISSION_TYPES: AssignmentSubmissionType[] = ['FILE', 'TEXT', 'LINK', 'MULTIPLE', 'NONE'];

type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type Dialog =
  | { type: 'class' }
  | { type: 'due' }
  | { type: 'points' }
  | { type: 'close' }
  | { type: 'publishAt' }
  | { type: 'link' }
  | { type: 'rename'; file: TeacherAssignmentFile }
  | { type: 'publish' }
  | { type: 'blocked'; issues: string[] }
  | { type: 'settings' }
  | null;

function pairValue(classId: string, subjectId: string) {
  return `${classId}:${subjectId}`;
}

export function TeacherAssignmentFormPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id: routeId } = useParams();
  const [searchParams] = useSearchParams();
  const isNew = !routeId || routeId === 'new';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const createLock = useRef<Promise<string> | null>(null);
  const hydrated = useRef<string | null>(null);

  const classes = useQuery({
    queryKey: ['teacher-classes'],
    queryFn: () => apiFetch<TeacherClassItem[]>('/teacher/classes'),
  });
  const existing = useQuery({
    queryKey: ['teacher-assignment', routeId],
    queryFn: () => apiFetch<TeacherAssignmentDetail>(`/teacher/assignments/${routeId}`),
    enabled: !isNew && Boolean(routeId),
  });

  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [pair, setPair] = useState('');
  const [dueAt, setDueAt] = useState<string | null>(null);
  const [closeAt, setCloseAt] = useState<string | null>(null);
  const [allowLate, setAllowLate] = useState(true);
  const [maxScore, setMaxScore] = useState(100);
  const [submissionType, setSubmissionType] = useState<AssignmentSubmissionType>('FILE');
  const [maxFiles, setMaxFiles] = useState(1);
  const [allowedMimeTypes, setAllowedMimeTypes] = useState<string[]>([...DEFAULT_ALLOWED_MIME_TYPES]);
  const [resubmitPolicy, setResubmitPolicy] = useState<AssignmentResubmitPolicy>('NEVER');
  const [scheduledPublishAt, setScheduledPublishAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [preview, setPreview] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [advanced, setAdvanced] = useState<'availability' | 'grading' | 'rules' | null>(null);
  const [dragging, setDragging] = useState(false);
  const [classQuery, setClassQuery] = useState('');
  const [showTitleError, setShowTitleError] = useState(false);
  const [showInstructionsError, setShowInstructionsError] = useState(false);

  const selectedClass = classes.data?.find((item) => pairValue(item.classId, item.subjectId) === pair);

  useEffect(() => {
    if (!isNew || pair || !classes.data?.length) return;
    const classId = searchParams.get('classId');
    const subjectId = searchParams.get('subjectId');
    const match = classes.data.find(
      (item) => item.classId === classId && item.subjectId === subjectId,
    );
    const first = match ?? classes.data[0];
    if (first) setPair(pairValue(first.classId, first.subjectId));
  }, [isNew, classes.data, pair, searchParams]);

  useEffect(() => {
    if (!existing.data || hydrated.current === existing.data.id) return;
    hydrated.current = existing.data.id;
    setTitle(existing.data.title === UNTITLED_ASSIGNMENT_TITLE ? '' : existing.data.title);
    setInstructions(existing.data.instructions);
    setPair(pairValue(existing.data.classId, existing.data.subjectId));
    setDueAt(existing.data.dueAt);
    setCloseAt(existing.data.closeAt);
    setAllowLate(existing.data.allowLate);
    setMaxScore(existing.data.maxScore);
    setSubmissionType(existing.data.submissionType);
    setMaxFiles(existing.data.maxFiles);
    setAllowedMimeTypes(existing.data.allowedMimeTypes);
    setResubmitPolicy(existing.data.resubmitPolicy);
    setScheduledPublishAt(
      existing.data.publishedAt && new Date(existing.data.publishedAt) > new Date()
        ? existing.data.publishedAt
        : null,
    );
    setDirty(false);
  }, [existing.data]);

  usePageTrail([
    { label: isNew ? t('teacher.createAssignment') : (existing.data?.title ?? t('nav.assignments')) },
  ]);

  const markDirty = () => setDirty(true);

  const payload = useCallback(() => {
    const [classId, subjectId] = pair.split(':');
    return {
      title: title.trim(),
      instructions,
      dueAt,
      closeAt,
      allowLate,
      submissionType,
      maxFiles,
      allowedMimeTypes,
      resubmitPolicy,
      maxScore,
      classId,
      subjectId,
    };
  }, [
    pair,
    title,
    instructions,
    dueAt,
    closeAt,
    allowLate,
    submissionType,
    maxFiles,
    allowedMimeTypes,
    resubmitPolicy,
    maxScore,
  ]);

  const persist = useCallback(
    async (idOverride?: string) => {
      if (!pair.includes(':')) throw new Error(t('errors.generic'));
      setSaveState('saving');
      const body = payload();
      const currentId = idOverride ?? (isNew ? undefined : routeId);
      try {
        const row = currentId
          ? await apiFetch<TeacherAssignmentDetail>(`/teacher/assignments/${currentId}`, {
              method: 'PATCH',
              body: JSON.stringify(body),
            })
          : await apiFetch<TeacherAssignmentDetail>('/teacher/assignments', {
              method: 'POST',
              body: JSON.stringify(body),
            });
        setDirty(false);
        setSaveState('saved');
        void queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] });
        queryClient.setQueryData(['teacher-assignment', row.id], row);
        if (!currentId) {
          navigate(`/teacher/assignments/${row.id}/edit`, { replace: true });
        }
        return row;
      } catch (error) {
        setSaveState('error');
        throw error;
      }
    },
    [isNew, navigate, pair, payload, queryClient, routeId, t],
  );

  const ensureId = useCallback(async () => {
    if (!isNew && routeId) return routeId;
    if (createLock.current) return createLock.current;
    createLock.current = persist().then((row) => row.id);
    try {
      return await createLock.current;
    } finally {
      createLock.current = null;
    }
  }, [isNew, persist, routeId]);

  useEffect(() => {
    if (!dirty || !pair) return;
    const handle = window.setTimeout(() => {
      void persist().catch(() => undefined);
    }, 800);
    return () => window.clearTimeout(handle);
  }, [dirty, persist, pair]);

  const assignment = existing.data;
  const files = assignment?.files ?? [];

  const uploadFile = useMutation({
    mutationFn: async (file: File) => {
      const assignmentId = await ensureId();
      const presign = await apiFetch<FilePresignResult>('/teacher/files/presign', {
        method: 'POST',
        body: JSON.stringify({
          purpose: 'assignment',
          assignmentId,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          fileName: file.name,
        }),
      });
      const put = await fetch(presign.uploadUrl, { method: 'PUT', body: file });
      if (!put.ok) throw new Error('Upload failed');
      return apiFetch<TeacherAssignmentDetail>(`/teacher/assignments/${assignmentId}/files`, {
        method: 'POST',
        body: JSON.stringify({
          storageKey: presign.storageKey,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          fileName: file.name,
        }),
      });
    },
    onSuccess: (row) => {
      queryClient.setQueryData(['teacher-assignment', row.id], row);
    },
  });

  const addLink = useMutation({
    mutationFn: async ({ fileName, url }: { fileName: string; url: string }) => {
      const assignmentId = await ensureId();
      return apiFetch<TeacherAssignmentDetail>(`/teacher/assignments/${assignmentId}/files`, {
        method: 'POST',
        body: JSON.stringify({ fileName, url }),
      });
    },
    onSuccess: (row) => queryClient.setQueryData(['teacher-assignment', row.id], row),
  });

  const renameFile = useMutation({
    mutationFn: async ({ fileId, fileName }: { fileId: string; fileName: string }) => {
      const assignmentId = await ensureId();
      return apiFetch<TeacherAssignmentDetail>(
        `/teacher/assignments/${assignmentId}/files/${fileId}`,
        { method: 'PATCH', body: JSON.stringify({ fileName }) },
      );
    },
    onSuccess: (row) => queryClient.setQueryData(['teacher-assignment', row.id], row),
  });

  const deleteFile = useMutation({
    mutationFn: async (fileId: string) => {
      const assignmentId = await ensureId();
      return apiFetch<TeacherAssignmentDetail>(
        `/teacher/assignments/${assignmentId}/files/${fileId}`,
        { method: 'DELETE' },
      );
    },
    onSuccess: (row) => queryClient.setQueryData(['teacher-assignment', row.id], row),
  });

  const publish = useMutation({
    mutationFn: async () => {
      const row = await persist();
      return apiFetch<TeacherAssignmentDetail>(`/teacher/assignments/${row.id}/publish`, {
        method: 'POST',
        body: JSON.stringify(scheduledPublishAt ? { publishedAt: scheduledPublishAt } : {}),
      });
    },
    onSuccess: (row) => {
      toast.success(t('teacher.saved'));
      void queryClient.invalidateQueries({ queryKey: ['teacher-assignments'] });
      navigate(`/teacher/assignments/${row.id}`);
    },
  });

  const unpublish = useMutation({
    mutationFn: async () => {
      const assignmentId = await ensureId();
      return apiFetch<TeacherAssignmentDetail>(`/teacher/assignments/${assignmentId}/unpublish`, {
        method: 'POST',
      });
    },
    onSuccess: (row) => {
      toast.success(t('teacher.saved'));
      queryClient.setQueryData(['teacher-assignment', row.id], row);
    },
  });

  const issues = useMemo(() => {
    const next: string[] = [];
    if (!title.trim() || title.trim() === UNTITLED_ASSIGNMENT_TITLE) {
      next.push(t('teacher.titleRequired'));
    }
    if (!stripAssignmentHtml(instructions)) next.push(t('teacher.instructionsRequired'));
    return next;
  }, [instructions, t, title]);

  const tryPublish = () => {
    setShowTitleError(issues.some((item) => item === t('teacher.titleRequired')));
    setShowInstructionsError(issues.some((item) => item === t('teacher.instructionsRequired')));
    if (issues.length > 0) {
      setDialog({ type: 'blocked', issues });
      return;
    }
    setDialog({ type: 'publish' });
  };

  const contextLabel = selectedClass
    ? `${selectedClass.subjectName} · ${selectedClass.className}`
    : assignment
      ? `${assignment.subjectName} · ${assignment.className}`
      : '';

  const backTo =
    searchParams.get('returnTo') ||
    (selectedClass
      ? `/teacher/classes/${selectedClass.classId}/${selectedClass.subjectId}/assignments`
      : '/teacher/assignments');

  if (classes.isLoading || (!isNew && existing.isLoading)) return <QueryLoading variant="assignment" />;
  if (classes.isError || !classes.data) return <QueryError onRetry={() => void classes.refetch()} />;
  if (!isNew && (existing.isError || !existing.data)) {
    return <QueryError onRetry={() => void existing.refetch()} />;
  }

  if (preview) {
    return (
      <AssignmentPreview
        title={title.trim() || t('teacher.untitledAssignment')}
        contextLabel={contextLabel}
        dueAt={dueAt}
        maxScore={maxScore}
        instructions={instructions}
        files={files}
        submissionType={submissionType}
        onBack={() => setPreview(false)}
      />
    );
  }

  const settings = (
    <SettingsPanel
      contextLabel={contextLabel}
      dueAt={dueAt}
      maxScore={maxScore}
      submissionType={submissionType}
      allowLate={allowLate}
      closeAt={closeAt}
      scheduledPublishAt={scheduledPublishAt}
      maxFiles={maxFiles}
      allowedMimeTypes={allowedMimeTypes}
      resubmitPolicy={resubmitPolicy}
      advanced={advanced}
      classLocked={Boolean(assignment?.hasStudentWork)}
      onOpen={(next) => setDialog({ type: next })}
      onToggleAdvanced={(next) => setAdvanced((current) => (current === next ? null : next))}
      onSubmissionType={(next) => {
        setSubmissionType(next);
        markDirty();
      }}
      onAllowLate={(next) => {
        setAllowLate(next);
        markDirty();
      }}
      onMaxFiles={(next) => {
        setMaxFiles(next);
        markDirty();
      }}
      onToggleMime={(mimeType) => {
        setAllowedMimeTypes((current) => {
          const has = current.includes(mimeType);
          if (has && current.length === 1) return current;
          return has ? current.filter((item) => item !== mimeType) : [...current, mimeType];
        });
        markDirty();
      }}
      onResubmit={(next) => {
        setResubmitPolicy(next);
        markDirty();
      }}
    />
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={backTo}
            className="inline-flex items-center gap-1 text-sm text-muted no-underline hover:text-accent"
          >
            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
            {t('nav.assignments')}
          </Link>
          <h1 className="mt-2 text-xl font-semibold tracking-tight">
            {isNew ? t('teacher.createAssignment') : t('teacher.editAssignment')}
          </h1>
          {contextLabel ? <p className="mt-0.5 text-sm text-muted">{contextLabel}</p> : null}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <p className="text-xs text-muted">
            {saveState === 'saving'
              ? t('teacher.saving')
              : saveState === 'saved'
                ? t('teacher.savedJustNow')
                : saveState === 'error'
                  ? t('teacher.saveFailed')
                  : dirty
                    ? t('teacher.saving')
                    : null}
          </p>
          <Button
            variant="secondary"
            size="sm"
            isPending={saveState === 'saving'}
            onPress={() => {
              void persist()
                .then(() => toast.success(t('teacher.saved')))
                .catch((error: Error) => toast.danger(error.message));
            }}
          >
            {t('teacher.saveDraft')}
          </Button>
          <Button variant="secondary" size="sm" onPress={() => setPreview(true)}>
            {t('teacher.preview')}
          </Button>
          <Button variant="primary" size="sm" onPress={tryPublish} isPending={publish.isPending}>
            {t('teacher.publish')}
          </Button>
          {assignment?.publishedAt ? (
            <Dropdown>
              <Button size="sm" variant="ghost" isIconOnly aria-label={t('teacher.actions')}>
                <MoreHorizontal className="size-4" />
              </Button>
              <Dropdown.Popover placement="bottom end" className="w-max">
                <Dropdown.Menu
                  onAction={(key: Key) => {
                    if (key === 'unpublish') unpublish.mutate();
                  }}
                >
                  <Dropdown.Item id="unpublish" textValue={t('teacher.unpublish')}>
                    <Label>{t('teacher.unpublish')}</Label>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          ) : null}
        </div>
      </div>

      <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <section className="rounded-xl border border-border bg-surface p-6">
            <h2 className="text-base font-semibold">{t('teacher.assignmentDetails')}</h2>
            <div className="mt-4 space-y-4">
              <TextField
                name="title"
                value={title}
                onChange={(value) => {
                  setTitle(value);
                  setShowTitleError(false);
                  markDirty();
                }}
              >
                <Label>{t('teacher.title')} *</Label>
                <Input className="h-12" placeholder={t('teacher.titlePlaceholder')} />
              </TextField>
              {showTitleError ? (
                <p className="text-sm text-danger">{t('teacher.titleRequired')}</p>
              ) : (
                <p className="text-xs text-muted">{title.length}/160</p>
              )}
              <div>
                <p className="mb-1.5 text-sm font-medium">{t('teacher.instructions')} *</p>
                <AssignmentRichTextEditor
                  value={instructions}
                  placeholder={t('teacher.instructionsPlaceholder')}
                  invalid={showInstructionsError}
                  onChange={(value) => {
                    setInstructions(value);
                    setShowInstructionsError(false);
                    markDirty();
                  }}
                />
                {showInstructionsError ? (
                  <p className="mt-1 text-sm text-danger">{t('teacher.instructionsRequired')}</p>
                ) : null}
              </div>
            </div>
          </section>

          <section
            className={cn(
              'rounded-xl border border-border bg-surface p-6',
              dragging && 'border-dashed border-accent bg-accent/5',
            )}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const file = event.dataTransfer.files[0];
              if (file) uploadFile.mutate(file);
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">{t('teacher.attachments')}</h2>
              <span className="text-xs text-muted">{t('teacher.optional')}</span>
            </div>
            {dragging ? (
              <p className="mt-6 text-center text-sm font-medium text-accent">{t('teacher.dropFiles')}</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {files.map((file) => {
                  const Icon = attachmentIcon(file.mimeType, file.url);
                  const href = file.url ?? file.downloadUrl;
                  return (
                    <li
                      key={file.id}
                      className="flex h-16 items-center gap-3 rounded-xl border border-border px-3"
                    >
                      <Icon className="size-5 shrink-0 text-muted" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{file.fileName}</p>
                        <p className="text-xs text-muted">
                          {mimeShortLabel(file.mimeType)}
                          {file.size > 0 ? ` · ${formatBytes(file.size)}` : ''}
                        </p>
                      </div>
                      <Dropdown>
                        <Button size="sm" variant="ghost" isIconOnly aria-label={t('teacher.actions')}>
                          <MoreHorizontal className="size-4" />
                        </Button>
                        <Dropdown.Popover placement="bottom end" className="w-max">
                          <Dropdown.Menu
                            onAction={(key: Key) => {
                              if (key === 'open' && href) window.open(href, '_blank', 'noopener');
                              if (key === 'rename') setDialog({ type: 'rename', file });
                              if (key === 'remove') deleteFile.mutate(file.id);
                            }}
                          >
                            <Dropdown.Item id="open" textValue={t('teacher.open')} isDisabled={!href}>
                              <Label>{t('teacher.download')}</Label>
                            </Dropdown.Item>
                            <Dropdown.Item id="rename" textValue={t('teacher.rename')}>
                              <Label>{t('teacher.rename')}</Label>
                            </Dropdown.Item>
                            <Dropdown.Item id="remove" textValue={t('teacher.delete')}>
                              <Label>{t('teacher.delete')}</Label>
                            </Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown.Popover>
                      </Dropdown>
                    </li>
                  );
                })}
              </ul>
            )}
            <input
              ref={fileInputRef}
              type="file"
              className="sr-only"
              accept={TEACHER_ACCEPT}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) uploadFile.mutate(file);
                event.target.value = '';
              }}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                isPending={uploadFile.isPending}
                onPress={() => fileInputRef.current?.click()}
              >
                <Paperclip className="size-4" />
                {t('teacher.addAttachment')}
              </Button>
              <Button variant="tertiary" size="sm" onPress={() => setDialog({ type: 'link' })}>
                {t('teacher.addLink')}
              </Button>
            </div>
          </section>
        </div>

        <aside className="xl:sticky xl:top-24">
          <div className="hidden xl:block">{settings}</div>
          <Button
            className="w-full xl:hidden"
            variant="secondary"
            onPress={() => setDialog({ type: 'settings' })}
          >
            <Settings2 className="size-4" />
            {t('teacher.assignmentSettings')}
          </Button>
        </aside>
      </div>

      {dialog?.type === 'class' ? (
        <ClassDialog
          items={classes.data.filter((item) => {
            const hay = `${item.subjectName} ${item.className}`.toLowerCase();
            return hay.includes(classQuery.trim().toLowerCase());
          })}
          value={pair}
          query={classQuery}
          locked={Boolean(assignment?.hasStudentWork)}
          onQuery={setClassQuery}
          onClose={() => setDialog(null)}
          onSelect={(next) => {
            setPair(next);
            markDirty();
            setDialog(null);
          }}
        />
      ) : null}
      {dialog?.type === 'due' ? (
        <DateTimeDialog
          title={t('teacher.dueDate')}
          value={dueAt}
          allowNone
          noneLabel={t('teacher.noDueDate')}
          onClose={() => setDialog(null)}
          onApply={(next) => {
            setDueAt(next);
            markDirty();
            setDialog(null);
          }}
        />
      ) : null}
      {dialog?.type === 'close' ? (
        <DateTimeDialog
          title={t('teacher.closeDate')}
          value={closeAt}
          allowNone
          noneLabel={t('teacher.none')}
          onClose={() => setDialog(null)}
          onApply={(next) => {
            setCloseAt(next);
            markDirty();
            setDialog(null);
          }}
        />
      ) : null}
      {dialog?.type === 'publishAt' ? (
        <DateTimeDialog
          title={t('teacher.publishDate')}
          value={scheduledPublishAt}
          allowNone
          noneLabel={t('teacher.immediately')}
          onClose={() => setDialog(null)}
          onApply={(next) => {
            setScheduledPublishAt(next);
            setDialog(null);
          }}
        />
      ) : null}
      {dialog?.type === 'points' ? (
        <PointsDialog
          value={maxScore}
          onClose={() => setDialog(null)}
          onApply={(next) => {
            setMaxScore(next);
            markDirty();
            setDialog(null);
          }}
        />
      ) : null}
      {dialog?.type === 'link' ? (
        <LinkDialog
          onClose={() => setDialog(null)}
          onSave={(fileName, url) => {
            addLink.mutate(
              { fileName, url },
              { onSuccess: () => setDialog(null) },
            );
          }}
          pending={addLink.isPending}
        />
      ) : null}
      {dialog?.type === 'rename' ? (
        <RenameDialog
          file={dialog.file}
          pending={renameFile.isPending}
          onClose={() => setDialog(null)}
          onSave={(fileName) => {
            renameFile.mutate(
              { fileId: dialog.file.id, fileName },
              { onSuccess: () => setDialog(null) },
            );
          }}
        />
      ) : null}
      {dialog?.type === 'settings' ? (
        <Modal>
          <Modal.Backdrop isOpen onOpenChange={() => setDialog(null)}>
            <Modal.Container>
              <Modal.Dialog className="max-h-[90vh] overflow-y-auto">
                <Modal.Header>
                  <Modal.Heading>{t('teacher.assignmentSettings')}</Modal.Heading>
                </Modal.Header>
                <div className="px-6 pb-6">{settings}</div>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      ) : null}
      {dialog?.type === 'blocked' ? (
        <Modal>
          <Modal.Backdrop isOpen onOpenChange={() => setDialog(null)}>
            <Modal.Container>
              <Modal.Dialog>
                <Modal.Header>
                  <Modal.Heading>{t('teacher.cantPublish')}</Modal.Heading>
                </Modal.Header>
                <p className="px-6 text-sm text-muted">
                  {t('teacher.cantPublishHint', { count: dialog.issues.length })}
                </p>
                <ul className="mt-3 list-disc px-10 pb-2 text-sm">
                  {dialog.issues.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <Modal.Footer>
                  <Button variant="primary" onPress={() => setDialog(null)}>
                    {t('teacher.review')}
                  </Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      ) : null}
      {dialog?.type === 'publish' ? (
        <Modal>
          <Modal.Backdrop isOpen onOpenChange={() => setDialog(null)}>
            <Modal.Container>
              <Modal.Dialog>
                <Modal.Header>
                  <Modal.Heading>{t('teacher.publishAssignment')}</Modal.Heading>
                </Modal.Header>
                <div className="space-y-2 px-6 text-sm">
                  <p className="font-medium">{title.trim()}</p>
                  <p className="text-muted">{contextLabel}</p>
                  <p className="text-muted">
                    {dueAt
                      ? t('teacher.due', { date: formatDue(dueAt, i18n.language) })
                      : t('teacher.noDueDate')}
                    {' · '}
                    {t('teacher.assignmentPoints', { count: maxScore })}
                    {' · '}
                    {t(`teacher.submission${submissionType.charAt(0)}${submissionType.slice(1).toLowerCase()}`)}
                  </p>
                  <p className="text-muted">{t('teacher.publishAppears')}</p>
                </div>
                <Modal.Footer>
                  <Button variant="tertiary" onPress={() => setDialog(null)}>
                    {t('teacher.cancel')}
                  </Button>
                  <Button
                    variant="primary"
                    isPending={publish.isPending}
                    onPress={() => publish.mutate()}
                  >
                    {t('teacher.publishAssignment')}
                  </Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      ) : null}
    </div>
  );
}

function SettingsPanel({
  contextLabel,
  dueAt,
  maxScore,
  submissionType,
  allowLate,
  closeAt,
  scheduledPublishAt,
  maxFiles,
  allowedMimeTypes,
  resubmitPolicy,
  advanced,
  classLocked,
  onOpen,
  onToggleAdvanced,
  onSubmissionType,
  onAllowLate,
  onMaxFiles,
  onToggleMime,
  onResubmit,
}: {
  contextLabel: string;
  dueAt: string | null;
  maxScore: number;
  submissionType: AssignmentSubmissionType;
  allowLate: boolean;
  closeAt: string | null;
  scheduledPublishAt: string | null;
  maxFiles: number;
  allowedMimeTypes: string[];
  resubmitPolicy: AssignmentResubmitPolicy;
  advanced: 'availability' | 'grading' | 'rules' | null;
  classLocked: boolean;
  onOpen: (type: 'class' | 'due' | 'points' | 'close' | 'publishAt') => void;
  onToggleAdvanced: (type: 'availability' | 'grading' | 'rules') => void;
  onSubmissionType: (value: AssignmentSubmissionType) => void;
  onAllowLate: (value: boolean) => void;
  onMaxFiles: (value: number) => void;
  onToggleMime: (mimeType: string) => void;
  onResubmit: (value: AssignmentResubmitPolicy) => void;
}) {
  const { t, i18n } = useTranslation();
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h2 className="text-base font-semibold">{t('teacher.assignmentSettings')}</h2>
      <div className="mt-4 space-y-1">
        <SettingRow
          label={t('teacher.settingClass')}
          value={contextLabel || '—'}
          disabled={classLocked}
          onPress={() => onOpen('class')}
        />
        <SettingRow
          label={t('teacher.settingDue')}
          value={dueAt ? formatDue(dueAt, i18n.language) : t('teacher.noDueDate')}
          onPress={() => onOpen('due')}
        />
        <SettingRow
          label={t('teacher.settingPoints')}
          value={String(maxScore)}
          onPress={() => onOpen('points')}
        />
        <div className="px-1 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            {t('teacher.settingSubmission')}
          </p>
          <Select
            className="mt-1 w-full"
            value={submissionType}
            onChange={(value: Key | Key[] | null) => {
              if (typeof value === 'string') onSubmissionType(value as AssignmentSubmissionType);
            }}
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                {SUBMISSION_TYPES.map((type) => (
                  <ListBox.Item
                    key={type}
                    id={type}
                    textValue={t(`teacher.submission${type.charAt(0)}${type.slice(1).toLowerCase()}`)}
                  >
                    {t(`teacher.submission${type.charAt(0)}${type.slice(1).toLowerCase()}`)}
                    <ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        </div>
        <div className="px-1 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            {t('teacher.settingAssignment')}
          </p>
          <p className="mt-1 text-sm font-medium">{t('teacher.individual')}</p>
        </div>
      </div>
      <div className="mt-4 border-t border-border pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          {t('teacher.advanced')}
        </p>
        <button
          type="button"
          className="mt-2 flex w-full items-center justify-between py-1.5 text-sm"
          onClick={() => onToggleAdvanced('availability')}
        >
          {t('teacher.availability')}
          <ChevronDown className={cn('size-4 transition', advanced === 'availability' && 'rotate-180')} />
        </button>
        {advanced === 'availability' ? (
          <div className="space-y-2 pb-2">
            <SettingRow
              label={t('teacher.publishDate')}
              value={
                scheduledPublishAt
                  ? formatDue(scheduledPublishAt, i18n.language)
                  : t('teacher.immediately')
              }
              onPress={() => onOpen('publishAt')}
            />
            <SettingRow
              label={t('teacher.dueDate')}
              value={dueAt ? formatDue(dueAt, i18n.language) : t('teacher.noDueDate')}
              onPress={() => onOpen('due')}
            />
            <Checkbox isSelected={allowLate} onChange={onAllowLate}>
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              <Checkbox.Content>
                <Label>{t('teacher.allowLate')}</Label>
              </Checkbox.Content>
            </Checkbox>
            <SettingRow
              label={t('teacher.closeDate')}
              value={closeAt ? formatDue(closeAt, i18n.language) : t('teacher.none')}
              onPress={() => onOpen('close')}
            />
          </div>
        ) : null}
        <button
          type="button"
          className="flex w-full items-center justify-between py-1.5 text-sm"
          onClick={() => onToggleAdvanced('grading')}
        >
          {t('teacher.grading')}
          <ChevronDown className={cn('size-4 transition', advanced === 'grading' && 'rotate-180')} />
        </button>
        {advanced === 'grading' ? (
          <div className="space-y-2 pb-2">
            <SettingRow
              label={t('teacher.settingPoints')}
              value={String(maxScore)}
              onPress={() => onOpen('points')}
            />
            <div className="px-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                {t('teacher.gradingScale')}
              </p>
              <p className="mt-1 text-sm">{t('teacher.gradingScalePoints')}</p>
            </div>
          </div>
        ) : null}
        <button
          type="button"
          className="flex w-full items-center justify-between py-1.5 text-sm"
          onClick={() => onToggleAdvanced('rules')}
        >
          {t('teacher.submissionRules')}
          <ChevronDown className={cn('size-4 transition', advanced === 'rules' && 'rotate-180')} />
        </button>
        {advanced === 'rules' ? (
          <div className="space-y-3 pb-1">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                {t('teacher.allowedTypes')}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {SUBMISSION_MIME_OPTIONS.map((option) => {
                  const selected = allowedMimeTypes.includes(option.mimeType);
                  return (
                    <button
                      key={option.mimeType}
                      type="button"
                      onClick={() => onToggleMime(option.mimeType)}
                    >
                      <Chip size="sm" color={selected ? 'accent' : 'default'} variant={selected ? 'soft' : 'tertiary'}>
                        {option.label}
                      </Chip>
                    </button>
                  );
                })}
              </div>
            </div>
            <TextField
              name="maxFiles"
              value={String(maxFiles)}
              onChange={(value) => {
                const next = Number(value);
                if (Number.isFinite(next) && next >= 1 && next <= 20) onMaxFiles(next);
              }}
            >
              <Label>{t('teacher.maxFiles')}</Label>
              <Input type="number" min={1} max={20} />
            </TextField>
            <RadioGroup
              value={resubmitPolicy}
              onChange={(value) => {
                if (typeof value === 'string') onResubmit(value as AssignmentResubmitPolicy);
              }}
            >
              <Label>{t('teacher.resubmissions')}</Label>
              {(['NEVER', 'ALWAYS', 'UNTIL_DUE'] as const).map((policy) => (
                <Radio key={policy} value={policy}>
                  <Radio.Control>
                    <Radio.Indicator />
                  </Radio.Control>
                  <Radio.Content>
                    <Label>
                      {policy === 'NEVER'
                        ? t('teacher.resubmitNever')
                        : policy === 'ALWAYS'
                          ? t('teacher.resubmitAlways')
                          : t('teacher.resubmitUntilDue')}
                    </Label>
                  </Radio.Content>
                </Radio>
              ))}
            </RadioGroup>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SettingRow({
  label,
  value,
  onPress,
  disabled,
}: {
  label: string;
  value: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      className="flex w-full items-start justify-between gap-2 rounded-lg px-1 py-2 text-start hover:bg-overlay disabled:opacity-60"
      onClick={onPress}
    >
      <span>
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</span>
        <span className="mt-0.5 block text-sm font-medium">{value}</span>
      </span>
      <ChevronDown className="mt-1 size-4 shrink-0 text-muted" />
    </button>
  );
}

function ClassDialog({
  items,
  value,
  query,
  locked,
  onQuery,
  onClose,
  onSelect,
}: {
  items: TeacherClassItem[];
  value: string;
  query: string;
  locked: boolean;
  onQuery: (value: string) => void;
  onClose: () => void;
  onSelect: (value: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal>
      <Modal.Backdrop isOpen onOpenChange={onClose}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{t('teacher.selectClass')}</Modal.Heading>
            </Modal.Header>
            {locked ? (
              <p className="px-6 pb-4 text-sm text-muted">{t('teacher.classLocked')}</p>
            ) : (
              <div className="space-y-3 px-6 pb-4">
                <TextField name="classSearch" value={query} onChange={onQuery}>
                  <Label>{t('teacher.searchClasses')}</Label>
                  <Input />
                </TextField>
                <ul className="max-h-64 overflow-y-auto">
                  {items.map((item) => {
                    const next = pairValue(item.classId, item.subjectId);
                    return (
                      <li key={next}>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-start text-sm hover:bg-overlay"
                          onClick={() => onSelect(next)}
                        >
                          {item.subjectName} · {item.className}
                          {next === value ? <Check className="size-4 text-accent" /> : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            <Modal.Footer>
              <Button variant="tertiary" onPress={onClose}>
                {t('teacher.cancel')}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function DateTimeDialog({
  title,
  value,
  allowNone,
  noneLabel,
  onClose,
  onApply,
}: {
  title: string;
  value: string | null;
  allowNone?: boolean;
  noneLabel?: string;
  onClose: () => void;
  onApply: (next: string | null) => void;
}) {
  const { t } = useTranslation();
  const [date, setDate] = useState(toDateInput(value));
  const [time, setTime] = useState(toTimeInput(value) || '16:00');
  const [none, setNone] = useState(!value);
  return (
    <Modal>
      <Modal.Backdrop isOpen onOpenChange={onClose}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{title}</Modal.Heading>
            </Modal.Header>
            <div className="space-y-3 px-6 pb-2">
              {allowNone ? (
                <Checkbox isSelected={none} onChange={setNone}>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <Checkbox.Content>
                    <Label>{noneLabel}</Label>
                  </Checkbox.Content>
                </Checkbox>
              ) : null}
              {!none ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm">
                    <span>{t('teacher.dueDate')}</span>
                    <input
                      type="date"
                      className="rounded-lg border border-border bg-background px-3 py-2"
                      value={date}
                      onChange={(event) => setDate(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 text-sm">
                    <span>{t('teacher.time')}</span>
                    <input
                      type="time"
                      className="rounded-lg border border-border bg-background px-3 py-2"
                      value={time}
                      onChange={(event) => setTime(event.target.value)}
                    />
                  </label>
                </div>
              ) : null}
            </div>
            <Modal.Footer>
              <Button variant="tertiary" onPress={onClose}>
                {t('teacher.cancel')}
              </Button>
              <Button
                variant="primary"
                onPress={() => onApply(none ? null : fromDateAndTime(date, time))}
              >
                {t('teacher.apply')}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function PointsDialog({
  value,
  onClose,
  onApply,
}: {
  value: number;
  onClose: () => void;
  onApply: (value: number) => void;
}) {
  const { t } = useTranslation();
  const [next, setNext] = useState(String(value));
  return (
    <Modal>
      <Modal.Backdrop isOpen onOpenChange={onClose}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{t('teacher.settingPoints')}</Modal.Heading>
            </Modal.Header>
            <div className="px-6">
              <TextField name="points" value={next} onChange={setNext}>
                <Label>{t('teacher.pts')}</Label>
                <Input type="number" min={1} max={1000} />
              </TextField>
            </div>
            <Modal.Footer>
              <Button variant="tertiary" onPress={onClose}>
                {t('teacher.cancel')}
              </Button>
              <Button
                variant="primary"
                onPress={() => {
                  const parsed = Number(next);
                  if (Number.isFinite(parsed) && parsed >= 1) onApply(Math.min(1000, Math.round(parsed)));
                }}
              >
                {t('teacher.apply')}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function LinkDialog({
  onClose,
  onSave,
  pending,
}: {
  onClose: () => void;
  onSave: (fileName: string, url: string) => void;
  pending: boolean;
}) {
  const { t } = useTranslation();
  const [fileName, setFileName] = useState('');
  const [url, setUrl] = useState('');
  return (
    <Modal>
      <Modal.Backdrop isOpen onOpenChange={onClose}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{t('teacher.addLink')}</Modal.Heading>
            </Modal.Header>
            <div className="space-y-3 px-6">
              <TextField name="linkName" value={fileName} onChange={setFileName}>
                <Label>{t('teacher.linkName')}</Label>
                <Input />
              </TextField>
              <TextField name="linkUrl" value={url} onChange={setUrl}>
                <Label>{t('teacher.linkUrl')}</Label>
                <Input />
              </TextField>
            </div>
            <Modal.Footer>
              <Button variant="tertiary" onPress={onClose}>
                {t('teacher.cancel')}
              </Button>
              <Button
                variant="primary"
                isPending={pending}
                isDisabled={!fileName.trim() || !url.trim()}
                onPress={() => onSave(fileName.trim(), url.trim())}
              >
                {t('teacher.save')}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function RenameDialog({
  file,
  pending,
  onClose,
  onSave,
}: {
  file: TeacherAssignmentFile;
  pending: boolean;
  onClose: () => void;
  onSave: (fileName: string) => void;
}) {
  const { t } = useTranslation();
  const [fileName, setFileName] = useState(file.fileName);
  return (
    <Modal>
      <Modal.Backdrop isOpen onOpenChange={onClose}>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{t('teacher.rename')}</Modal.Heading>
            </Modal.Header>
            <div className="px-6">
              <TextField name="fileName" value={fileName} onChange={setFileName}>
                <Label>{t('teacher.title')}</Label>
                <Input />
              </TextField>
            </div>
            <Modal.Footer>
              <Button variant="tertiary" onPress={onClose}>
                {t('teacher.cancel')}
              </Button>
              <Button
                variant="primary"
                isPending={pending}
                isDisabled={!fileName.trim()}
                onPress={() => onSave(fileName.trim())}
              >
                {t('teacher.save')}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function AssignmentPreview({
  title,
  contextLabel,
  dueAt,
  maxScore,
  instructions,
  files,
  submissionType,
  onBack,
}: {
  title: string;
  contextLabel: string;
  dueAt: string | null;
  maxScore: number;
  instructions: string;
  files: TeacherAssignmentFile[];
  submissionType: AssignmentSubmissionType;
  onBack: () => void;
}) {
  const { t, i18n } = useTranslation();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-accent"
          onClick={onBack}
        >
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
          {t('teacher.backToEditor')}
        </button>
        <Button variant="secondary" size="sm" onPress={onBack}>
          {t('teacher.editAssignmentAction')}
        </Button>
      </div>
      <div>
        <p className="text-xs font-medium text-muted">{t('teacher.previewTitle')}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted">
          {contextLabel}
          {dueAt ? ` · ${t('teacher.due', { date: formatDue(dueAt, i18n.language) })}` : ''}
          {` · ${t('teacher.assignmentPoints', { count: maxScore })}`}
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="rounded-xl border border-border bg-surface p-5">
          <AssignmentInstructions html={instructions} />
          {files.length > 0 ? (
            <ul className="mt-5 divide-y divide-border border-t border-border pt-4">
              {files.map((file) => {
                const Icon = attachmentIcon(file.mimeType, file.url);
                return (
                  <li key={file.id} className="flex items-center gap-3 py-2.5">
                    <Icon className="size-4 text-muted" />
                    <span className="text-sm">{file.fileName}</span>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-xs font-medium text-muted">{t('student.submission')}</p>
          <p className="mt-3 text-sm text-muted">
            {submissionType === 'NONE' ? t('student.noSubmission') : t('teacher.submitAssignment')}
          </p>
          {submissionType !== 'NONE' ? (
            <Button variant="primary" className="mt-4 w-full" isDisabled>
              {t('teacher.submitAssignment')}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
