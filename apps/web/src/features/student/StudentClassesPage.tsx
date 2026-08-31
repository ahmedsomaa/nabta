import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card } from '@heroui/react';
import type { StudentSubjectListItem } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { EmptyCard, QueryError, QueryLoading } from './QueryState';

export function StudentClassesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ['student-subjects'],
    queryFn: () => apiFetch<StudentSubjectListItem[]>('/me/subjects'),
  });

  if (query.isLoading) return <QueryLoading />;
  if (query.isError || !query.data) return <QueryError onRetry={() => void query.refetch()} />;

  if (query.data.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t('nav.myClasses')}</h1>
        <EmptyCard>{t('student.emptySubjects')}</EmptyCard>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t('nav.myClasses')}</h1>
      <div className="grid gap-3 md:grid-cols-2">
        {query.data.map((subject) => (
          <button
            key={subject.id}
            type="button"
            className="rounded-xl text-start"
            onClick={() => navigate(`/student/classes/${subject.id}`)}
          >
            <Card className="h-full p-4 transition-colors hover:border-accent/40">
              <Card.Header>
                <Card.Title>{subject.name}</Card.Title>
                <Card.Description>
                  {subject.className}
                  {subject.teacherName ? ` · ${t('student.teacher')}: ${subject.teacherName}` : ''}
                </Card.Description>
              </Card.Header>
              <div className="mt-4 space-y-1">
                <div className="h-2 overflow-hidden rounded-full bg-surface">
                  <div className="h-full bg-accent" style={{ width: `${subject.progressPercent}%` }} />
                </div>
                <p className="text-xs text-muted">{t('student.progress', { percent: subject.progressPercent })}</p>
              </div>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}
