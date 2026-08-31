import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card } from '@heroui/react';
import type { UpcomingAssignment } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { EmptyCard, QueryError, QueryLoading } from './QueryState';
import { StatusChip, formatDue } from './StatusChip';

export function StudentAssignmentsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ['student-assignments'],
    queryFn: () => apiFetch<UpcomingAssignment[]>('/me/assignments'),
  });

  if (query.isLoading) return <QueryLoading />;
  if (query.isError || !query.data) return <QueryError onRetry={() => void query.refetch()} />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t('nav.assignments')}</h1>
      {query.data.length === 0 ? (
        <EmptyCard>{t('student.emptyAssignments')}</EmptyCard>
      ) : (
        <div className="grid gap-3">
          {query.data.map((item) => (
            <button
              key={item.id}
              type="button"
              className="rounded-xl text-start"
              onClick={() => navigate(`/student/assignments/${item.id}`)}
            >
              <Card className="p-4 transition-colors hover:border-accent/40">
                <Card.Header>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Card.Title>{item.title}</Card.Title>
                      <Card.Description>
                        {item.subjectName} · {t('student.due', { date: formatDue(item.dueAt, i18n.language) })}
                      </Card.Description>
                    </div>
                    <StatusChip status={item.status} />
                  </div>
                </Card.Header>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
