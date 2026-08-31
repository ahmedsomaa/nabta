import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card } from '@heroui/react';
import type { TeacherClassItem } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { EmptyCard, QueryError, QueryLoading } from './QueryState';

export function TeacherClassesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ['teacher-classes'],
    queryFn: () => apiFetch<TeacherClassItem[]>('/teacher/classes'),
  });

  if (query.isLoading) return <QueryLoading />;
  if (query.isError || !query.data) return <QueryError onRetry={() => void query.refetch()} />;

  if (query.data.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">{t('nav.classes')}</h1>
        <EmptyCard>{t('teacher.emptyClasses')}</EmptyCard>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t('nav.classes')}</h1>
      <div className="grid gap-3 md:grid-cols-2">
        {query.data.map((item) => (
          <button
            key={`${item.classId}-${item.subjectId}`}
            type="button"
            className="rounded-xl text-start"
            onClick={() => navigate(`/teacher/classes/${item.classId}/${item.subjectId}`)}
          >
            <Card className="h-full p-4 transition-colors hover:border-accent/40">
              <Card.Header>
                <Card.Title>
                  {item.className} · {item.subjectName}
                </Card.Title>
              </Card.Header>
            </Card>
          </button>
        ))}
      </div>
    </div>
  );
}
