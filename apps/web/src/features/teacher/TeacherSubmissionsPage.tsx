import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button, Card, Chip, Input, Label, TextArea, TextField, toast } from '@heroui/react';
import type { TeacherSubmissionDetail, TeacherSubmissionListItem } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { StatusChip } from '@/features/student/StatusChip';
import { EmptyCard, QueryError, QueryLoading } from './QueryState';

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

  const publish = useMutation({
    mutationFn: () => apiFetch(`/teacher/assignments/${id}/publish-grades`, { method: 'POST' }),
    onSuccess: () => {
      toast.success(t('teacher.gradesPublished'));
      void queryClient.invalidateQueries({ queryKey: ['teacher-submissions', id] });
    },
  });

  if (list.isLoading) return <QueryLoading />;
  if (list.isError || !list.data) return <QueryError onRetry={() => void list.refetch()} />;

  return (
    <div className="space-y-4">
      <Link to="/teacher/assignments" className="text-sm text-muted no-underline hover:text-accent">
        {t('nav.assignments')}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t('teacher.submissions')}</h1>
        <Button variant="primary" onPress={() => publish.mutate()} isPending={publish.isPending}>
          {t('teacher.publishGrades')}
        </Button>
      </div>
      {list.data.length === 0 ? (
        <EmptyCard>{t('teacher.emptySubmissions')}</EmptyCard>
      ) : (
        <div className="grid gap-3">
          {list.data.map((row) => (
            <Card key={row.studentId} className="p-4">
              <Card.Header>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Card.Title>
                    {row.givenName} {row.familyName}
                  </Card.Title>
                  <StatusChip status={row.status} />
                </div>
                <Card.Description>
                  {row.score != null ? `${row.score}` : t('teacher.noGrade')}
                </Card.Description>
              </Card.Header>
              {row.id ? (
                <div className="mt-3">
                  <Button size="sm" variant="secondary" onPress={() => setOpenId(row.id)}>
                    {t('teacher.grade')}
                  </Button>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
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
    <div className="space-y-3 rounded-xl border border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">
          {submission.givenName} {submission.familyName}
        </h2>
        <Chip size="sm" variant="soft">
          {t('teacher.maxScore')}: {submission.maxScore}
        </Chip>
      </div>
      {submission.files.map((file) => (
        <a key={file.id} href={file.downloadUrl} className="text-sm text-accent" target="_blank" rel="noreferrer">
          {t('teacher.viewFile')}: {file.fileName}
        </a>
      ))}
      <TextField name="score" value={score} onChange={setScore}>
        <Label>{t('teacher.score')}</Label>
        <Input type="number" min={0} max={submission.maxScore} />
      </TextField>
      <TextField name="feedback" value={feedback} onChange={setFeedback}>
        <Label>{t('teacher.feedback')}</Label>
        <TextArea rows={4} />
      </TextField>
      <div className="flex gap-2">
        <Button variant="primary" isPending={save.isPending} onPress={() => save.mutate()}>
          {t('teacher.save')}
        </Button>
        <Button variant="tertiary" onPress={onClose}>
          {t('teacher.cancel')}
        </Button>
      </div>
    </div>
  );
}
