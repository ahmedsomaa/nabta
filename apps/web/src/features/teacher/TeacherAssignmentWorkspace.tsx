import { Link, Navigate, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button } from '@heroui/react';
import { ArrowLeft, ClipboardList, Inbox, UserX } from 'lucide-react';
import type { TeacherAssignmentDetail } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from './QueryState';
import { PortalMetric } from '@/components/portal/PortalChrome';
import { PortalNavTabs } from '@/components/portal/PortalTabs';
import { usePageTrail } from '@/layouts/PageTrail';
import { formatDue } from '@/features/student/StatusChip';
import { AssignmentInstructions, attachmentIcon, formatBytes, mimeShortLabel } from './assignmentShared';

export type AssignmentOutlet = { assignment: TeacherAssignmentDetail };

export function TeacherAssignmentWorkspace() {
  const { t, i18n } = useTranslation();
  const { id = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ['teacher-assignment', id],
    queryFn: () => apiFetch<TeacherAssignmentDetail>(`/teacher/assignments/${id}`),
    enabled: Boolean(id),
  });

  usePageTrail(query.data ? [{ label: query.data.title }] : []);

  if (query.isLoading) return <QueryLoading variant="assignment" />;
  if (query.isError || !query.data) return <QueryError onRetry={() => void query.refetch()} />;

  const assignment = query.data;
  const base = `/teacher/assignments/${assignment.id}`;
  const onIndex = location.pathname === base;
  if (!assignment.publishedAt && onIndex) {
    return <Navigate to={`${base}/edit`} replace />;
  }

  return (
    <div className="space-y-6">
      <Link
        to="/teacher/assignments"
        className="inline-flex items-center gap-1 text-sm text-muted no-underline hover:text-accent"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
        {t('nav.assignments')}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight [overflow-wrap:anywhere]">
            {assignment.title}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {assignment.subjectName} · {assignment.className}
          </p>
          <p className="mt-1 text-sm text-muted">
            {assignment.publishedAt
              ? t('teacher.publishedOn', { date: formatDue(assignment.publishedAt, i18n.language) })
              : t('teacher.draft')}
            {assignment.dueAt
              ? ` · ${t('teacher.due', { date: formatDue(assignment.dueAt, i18n.language) })}`
              : ` · ${t('teacher.noDueDate')}`}
          </p>
          <p className="mt-1 text-sm text-muted">
            {t('teacher.studentsCount', { count: assignment.studentCount })}
          </p>
        </div>
        <Button variant="secondary" onPress={() => navigate(`${base}/edit`)}>
          {t('teacher.editAssignmentAction')}
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <PortalMetric
          label={t('teacher.submittedCount')}
          value={String(assignment.submittedCount)}
          icon={Inbox}
          onPress={() => navigate(`${base}/submissions`)}
        />
        <PortalMetric
          label={t('teacher.toGrade')}
          value={String(assignment.toGradeCount)}
          icon={ClipboardList}
          tone={assignment.toGradeCount > 0 ? 'warning' : 'accent'}
          onPress={() => navigate(`${base}/grades`)}
        />
        <PortalMetric
          label={t('teacher.missingCount')}
          value={String(assignment.missingCount)}
          icon={UserX}
          tone={assignment.missingCount > 0 ? 'warning' : 'accent'}
          onPress={() => navigate(`${base}/submissions`)}
        />
      </div>
      <PortalNavTabs
        label={t('teacher.tabAssignment')}
        items={[
          { to: base, title: t('teacher.tabAssignment'), end: true },
          { to: `${base}/submissions`, title: t('teacher.submissions'), count: assignment.submittedCount || undefined },
          { to: `${base}/grades`, title: t('teacher.tabGrades'), count: assignment.toGradeCount || undefined },
        ]}
      />
      <Outlet context={{ assignment }} />
    </div>
  );
}

export function TeacherAssignmentOverviewPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const query = useQuery({
    queryKey: ['teacher-assignment', id],
    queryFn: () => apiFetch<TeacherAssignmentDetail>(`/teacher/assignments/${id}`),
    enabled: Boolean(id),
  });
  if (query.isLoading) return <QueryLoading variant="assignment" />;
  if (query.isError || !query.data) return <QueryError onRetry={() => void query.refetch()} />;
  const assignment = query.data;
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <AssignmentInstructions html={assignment.instructions} />
      {assignment.files.length > 0 ? (
        <ul className="mt-5 divide-y divide-border border-t border-border pt-4">
          {assignment.files.map((file) => {
            const Icon = attachmentIcon(file.mimeType, file.url);
            const href = file.url ?? file.downloadUrl;
            const inner = (
              <>
                <Icon className="size-4 shrink-0 text-muted" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{file.fileName}</span>
                  <span className="text-xs text-muted">
                    {mimeShortLabel(file.mimeType)}
                    {file.size > 0 ? ` · ${formatBytes(file.size)}` : ''}
                  </span>
                </span>
              </>
            );
            return (
              <li key={file.id}>
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 py-2.5 text-inherit no-underline hover:text-accent"
                  >
                    {inner}
                  </a>
                ) : (
                  <div className="flex items-center gap-3 py-2.5">{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      ) : null}
      {!assignment.instructions.trim() && assignment.files.length === 0 ? (
        <p className="text-sm text-muted">{t('student.emptyInstructions')}</p>
      ) : null}
    </div>
  );
}
