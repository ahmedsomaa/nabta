import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button, Card, Chip } from '@heroui/react';
import { Check } from 'lucide-react';
import type { StudentSubjectDetail } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { EmptyCard, QueryError, QueryLoading } from './QueryState';
import { StatusChip, formatDue } from './StatusChip';

export function StudentSubjectPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { subjectId = '' } = useParams();
  const query = useQuery({
    queryKey: ['student-subject', subjectId],
    queryFn: () => apiFetch<StudentSubjectDetail>(`/me/subjects/${subjectId}`),
    enabled: Boolean(subjectId),
  });

  if (query.isLoading) return <QueryLoading />;
  if (query.isError || !query.data) return <QueryError onRetry={() => void query.refetch()} />;

  const subject = query.data;
  const lessonCount = subject.units.reduce((sum, unit) => sum + unit.lessons.length, 0);

  return (
    <div className="space-y-6">
      <div>
        <Link to="/student/classes" className="text-sm text-muted no-underline hover:text-accent">
          {t('student.backToClasses')}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{subject.name}</h1>
        <p className="mt-1 text-sm text-muted">
          {subject.className}
          {subject.teacherName ? ` · ${t('student.teacher')}: ${subject.teacherName}` : ''}
        </p>
        <p className="mt-2 text-sm">{t('student.progress', { percent: subject.progressPercent })}</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('student.units')}</h2>
        {lessonCount === 0 ? (
          <EmptyCard>{t('student.emptyLessons')}</EmptyCard>
        ) : (
          subject.units.map((unit) => (
            <Card key={unit.id} className="p-4">
              <Card.Header>
                <Card.Title>{unit.title}</Card.Title>
              </Card.Header>
              <ul className="mt-3 space-y-1">
                {unit.lessons.map((lesson) => (
                  <li key={lesson.id}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-start text-sm hover:bg-overlay"
                      onClick={() => navigate(`/student/classes/${subject.id}/lessons/${lesson.id}`)}
                    >
                      <span>{lesson.title}</span>
                      {lesson.completed ? (
                        <Chip size="sm" color="success" variant="soft">
                          <Check className="size-3" aria-hidden />
                          {t('student.completed')}
                        </Chip>
                      ) : null}
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          ))
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('student.upcoming')}</h2>
        {subject.assignments.length === 0 ? (
          <EmptyCard>{t('student.emptyAssignments')}</EmptyCard>
        ) : (
          <div className="grid gap-3">
            {subject.assignments.map((item) => (
              <Card key={item.id} className="p-4">
                <Card.Header>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Card.Title>{item.title}</Card.Title>
                      <Card.Description>
                        {t('student.due', { date: formatDue(item.dueAt, i18n.language) })}
                      </Card.Description>
                    </div>
                    <StatusChip status={item.status} />
                  </div>
                </Card.Header>
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={() => navigate(`/student/assignments/${item.id}`)}
                  >
                    {t('student.viewAssignment')}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
