import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FileQuestion } from 'lucide-react';
import type { StudentAssessmentListItem } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from './QueryState';
import { StudentEmptyState, StudentPageHeader } from './StudentChrome';
import { WorkItemCard } from './WorkItemCard';

const DONE = new Set(['SUBMITTED', 'EXPIRED']);

export function StudentQuizzesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ['student-assessments'],
    queryFn: () => apiFetch<StudentAssessmentListItem[]>('/me/assessments'),
  });

  if (query.isLoading) return <QueryLoading variant="grid" />;
  if (query.isError || !query.data) return <QueryError onRetry={() => void query.refetch()} />;

  const todo = query.data.filter((item) => !DONE.has(item.status));
  const done = query.data.filter((item) => DONE.has(item.status));
  const statusParts = [
    { key: 'todo', text: t('student.toDoCount', { count: todo.length }) },
    done.length > 0 ? { key: 'done', text: t('student.doneCount', { count: done.length }) } : null,
  ].filter((part): part is { key: string; text: string } => Boolean(part));

  const sections = [
    { key: 'todo', title: t('student.work'), items: todo },
    { key: 'done', title: t('student.groupDone'), items: done },
  ].filter((section) => section.items.length > 0);

  return (
    <div className="space-y-6">
      <StudentPageHeader title={t('nav.quizzes')} />
      {query.data.length === 0 ? (
        <StudentEmptyState icon={FileQuestion}>{t('assessment.empty')}</StudentEmptyState>
      ) : (
        <>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            {statusParts.map((part, index) => (
              <span key={part.key} className="contents">
                {index > 0 ? (
                  <span className="text-border" aria-hidden>
                    ·
                  </span>
                ) : null}
                {part.text}
              </span>
            ))}
          </p>
          {sections.map((section) => (
            <section key={section.key} className="space-y-3">
              <h2 className="text-lg font-semibold">
                {section.title}{' '}
                <span className="font-normal text-muted">({section.items.length})</span>
              </h2>
              <div className="grid gap-3">
                {section.items.map((item) => (
                  <WorkItemCard
                    key={item.id}
                    kind="assessment"
                    title={item.title}
                    subtitle={[
                      item.subjectName,
                      t('assessment.attempts', { used: item.attemptsUsed, max: item.maxAttempts }),
                    ].join(' · ')}
                    status={item.status}
                    onPress={() => navigate(`/student/assessments/${item.id}`)}
                  />
                ))}
              </div>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
