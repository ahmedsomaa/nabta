import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button, Card, Chip } from '@heroui/react';
import type { TeacherAssessmentListItem } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { EmptyCard, QueryError, QueryLoading } from './QueryState';

export function TeacherAssessmentsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ['teacher-assessments'],
    queryFn: () => apiFetch<TeacherAssessmentListItem[]>('/teacher/assessments'),
  });

  if (query.isLoading) return <QueryLoading />;
  if (query.isError || !query.data) return <QueryError onRetry={() => void query.refetch()} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t('nav.quizzes')}</h1>
        <Button variant="primary" onPress={() => navigate('/teacher/assessments/new')}>
          {t('teacher.newQuiz')}
        </Button>
      </div>
      {query.data.length === 0 ? (
        <EmptyCard>{t('teacher.emptyQuizzes')}</EmptyCard>
      ) : (
        <div className="grid gap-3">
          {query.data.map((item) => (
            <Card key={item.id} className="p-4">
              <Card.Header>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Card.Title>{item.title}</Card.Title>
                    <Card.Description>
                      {item.className} · {item.subjectName} ·{' '}
                      {t('teacher.questionCount', { count: item.questionCount })}
                    </Card.Description>
                  </div>
                  <Chip size="sm" variant="soft" color={item.publishedAt ? 'success' : 'default'}>
                    {item.publishedAt ? t('teacher.published') : t('teacher.draft')}
                  </Chip>
                </div>
              </Card.Header>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onPress={() => navigate(`/teacher/assessments/${item.id}`)}>
                  {t('teacher.open')}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onPress={() => navigate(`/teacher/assessments/${item.id}/results`)}
                >
                  {t('teacher.results')}
                  {item.attemptCount > 0 ? ` (${item.attemptCount})` : ''}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
