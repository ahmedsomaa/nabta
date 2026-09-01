import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button, Chip, Input, Label, TextArea, TextField, toast } from '@heroui/react';
import { ClipboardList } from 'lucide-react';
import type { TeacherSubmissionDetail, TeacherSubmissionListItem } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { StatusChip } from '@/features/student/StatusChip';
import { QueryError, QueryLoading } from './QueryState';
import {
  PortalEmptyState,
  PortalList,
  PortalPageHeader,
  PortalPanel,
  portalListRowClass,
} from '@/components/portal/PortalChrome';
import { usePageTrail } from '@/layouts/PageTrail';

export function TeacherSubmissionsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { id = '' } = useParams();
  const [openId, setOpenId] = useState<string | null>(null);
  const list = useQuery({
    queryKey: ['teacher-submissions', id],
    queryFn: () => apiFetch<TeacherSubmissionListItem[]>(`/teacher/assignments/${id}/submissions`),
    enabled: Boolean(id),
  });
  const detail = useQuery({
    queryKey: ['teacher-submission', openId],
    queryFn: () => apiFetch<TeacherSubmissionDetail>(`/teacher/submissions/${openId}`),
    enabled: Boolean(openId),
  });

  usePageTrail([{ label: t('teacher.submissions') }]);

  const publish = useMutation({
    mutationFn: () => apiFetch(`/teacher/assignments/${id}/publish-grades`, { method: 'POST' }),
    onSuccess: () => {
      toast.success(t('teacher.gradesPublished'));
      void queryClient.invalidateQueries({ queryKey: ['teacher-submissions', id] });
    },
  });

  if (list.isLoading) return <QueryLoading variant="grid" />;
  if (list.isError || !list.data) return <QueryError onRetry={() => void list.refetch()} />;

  return (
    <div className="space-y-4">
      <PortalPageHeader
        title={t('teacher.submissions')}
        trailing={
          <Button variant="primary" onPress={() => publish.mutate()} isPending={publish.isPending}>
            {t('teacher.publishGrades')}
          </Button>
        }
      />
      {list.data.length === 0 ? (
        <PortalEmptyState icon={ClipboardList}>{t('teacher.emptySubmissions')}</PortalEmptyState>
      ) : (
        <PortalList>
          {list.data.map((row) => (
            <li key={row.studentId} className="border-b border-border last:border-b-0">
              <button
                type="button"
                className={portalListRowClass}
                disabled={!row.id}
                onClick={() => row.id && setOpenId(row.id)}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {row.givenName} {row.familyName}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {row.score != null ? `${row.score}` : t('teacher.noGrade')}
                  </p>
                </div>
                <StatusChip status={row.status} />
              </button>
            </li>
          ))}
        </PortalList>
      )}

      {openId && detail.data ? (
        <GradePanel
          submission={detail.data}
          onClose={() => setOpenId(null)}
          onSaved={() => {
            void queryClient.invalidateQueries({ queryKey: ['teacher-submissions', id] });
            void queryClient.invalidateQueries({ queryKey: ['teacher-submission', openId] });
          }}
        />
      ) : null}
    </div>
  );
}

function GradePanel({
  submission,
  onClose,
  onSaved,
}: {
  submission: TeacherSubmissionDetail;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [score, setScore] = useState(String(submission.score ?? ''));
  const [feedback, setFeedback] = useState(submission.feedback ?? '');
  const save = useMutation({
    mutationFn: () =>
      apiFetch(`/teacher/submissions/${submission.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ score: Number(score), feedback }),
      }),
    onSuccess: () => {
      toast.success(t('teacher.gradedSaved'));
      onSaved();
    },
  });

  return (
    <PortalPanel>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold [overflow-wrap:anywhere]">
          {submission.givenName} {submission.familyName}
        </h2>
        <Chip size="sm" variant="soft">
          {t('teacher.maxScore')}: {submission.maxScore}
        </Chip>
      </div>
      {submission.files.map((file) => (
        <a
          key={file.id}
          href={file.downloadUrl}
          className="mt-3 block text-sm text-accent"
          target="_blank"
          rel="noreferrer"
        >
          {t('teacher.viewFile')}: {file.fileName}
        </a>
      ))}
      <div className="mt-4 space-y-3">
        <TextField name="score" value={score} onChange={setScore}>
          <Label>{t('teacher.score')}</Label>
          <Input type="number" min={0} max={submission.maxScore} />
        </TextField>
        <TextField name="feedback" value={feedback} onChange={setFeedback}>
          <Label>{t('teacher.feedback')}</Label>
          <TextArea rows={4} />
        </TextField>
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="primary" isPending={save.isPending} onPress={() => save.mutate()}>
          {t('teacher.save')}
        </Button>
        <Button variant="tertiary" onPress={onClose}>
          {t('teacher.cancel')}
        </Button>
      </div>
    </PortalPanel>
  );
}
