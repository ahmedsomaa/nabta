import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button, Chip } from '@heroui/react';
import { FileQuestion } from 'lucide-react';
import type { TeacherAssessmentListItem } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from './QueryState';
import { PortalEmptyState, PortalList, PortalPageHeader } from '@/components/portal/PortalChrome';

export function TeacherAssessmentsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ['teacher-assessments'],
    queryFn: () => apiFetch<TeacherAssessmentListItem[]>('/teacher/assessments'),
  });

  if (query.isLoading) return <QueryLoading variant="grid" />;
  if (query.isError || !query.data) return <QueryError onRetry={() => void query.refetch()} />;

  const draft = query.data.filter((item) => !item.publishedAt);
  const published = query.data.filter((item) => item.publishedAt);
  const sections = [
    { key: 'draft', title: t('teacher.draft'), items: draft },
    { key: 'published', title: t('teacher.published'), items: published },
  ].filter((section) => section.items.length > 0);

  return (
    <div className="space-y-6">
      <PortalPageHeader
        title={t('nav.quizzes')}
        trailing={
          <Button variant="primary" onPress={() => navigate('/teacher/assessments/new')}>
            {t('teacher.newQuiz')}
          </Button>
        }
      />
      {query.data.length === 0 ? (
        <PortalEmptyState
          icon={FileQuestion}
          action={{
            label: t('teacher.newQuiz'),
            onPress: () => navigate('/teacher/assessments/new'),
          }}
        >
          {t('teacher.emptyQuizzes')}
        </PortalEmptyState>
      ) : (
        sections.map((section) => (
          <section key={section.key} className="space-y-3">
            <h2 className="text-lg font-semibold">
              {section.title}{' '}
              <span className="text-sm font-normal text-muted">({section.items.length})</span>
            </h2>
            <PortalList>
              {section.items.map((item) => (
                <li key={item.id} className="border-b border-border last:border-b-0">
                  <div className="flex items-start gap-3 px-3 py-2.5">
                    <Link
                      to={`/teacher/assessments/${item.id}`}
                      className="min-w-0 flex-1 text-start text-inherit no-underline"
                    >
                      <p className="truncate font-medium">{item.title}</p>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {item.className} · {item.subjectName} ·{' '}
                        {t('teacher.questionCount', { count: item.questionCount })}
                      </p>
                    </Link>
                    <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
                      <Chip
                        size="sm"
                        variant="soft"
                        color={item.publishedAt ? 'success' : 'default'}
                      >
                        {item.publishedAt ? t('teacher.published') : t('teacher.draft')}
                      </Chip>
                      <Link
                        to={`/teacher/assessments/${item.id}/results`}
                        className="text-xs text-accent no-underline hover:opacity-80"
                      >
                        {t('teacher.results')}
                        {item.attemptCount > 0 ? ` (${item.attemptCount})` : ''}
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </PortalList>
          </section>
        ))
      )}
    </div>
  );
}
