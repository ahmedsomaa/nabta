import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, Chip } from '@heroui/react';
import type { TeacherStudentOverview } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { StatusChip } from '@/features/student/StatusChip';
import { QueryError, QueryLoading } from './QueryState';

export function TeacherStudentPage() {
  const { t } = useTranslation();
  const { classId = '', subjectId = '', studentId = '' } = useParams();
  const query = useQuery({
    queryKey: ['teacher-student', classId, subjectId, studentId],
    queryFn: () =>
      apiFetch<TeacherStudentOverview>(
        `/teacher/classes/${classId}/subjects/${subjectId}/students/${studentId}`,
      ),
    enabled: Boolean(classId && subjectId && studentId),
  });

  if (query.isLoading) return <QueryLoading />;
  if (query.isError || !query.data) return <QueryError onRetry={() => void query.refetch()} />;

  const student = query.data;

  return (
    <div className="space-y-6">
      <Link
        to={`/teacher/classes/${classId}/${subjectId}`}
        className="text-sm text-muted no-underline hover:text-accent"
      >
        {t('teacher.backToClass')}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">
        {student.givenName} {student.familyName}
      </h1>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('student.lessons')}</h2>
        <div className="grid gap-2">
          {student.lessons.map((lesson) => (
            <Card key={lesson.id} className="p-4">
              <Card.Header>
                <div className="flex items-center justify-between gap-2">
                  <Card.Title>{lesson.title}</Card.Title>
                  {lesson.completed ? (
                    <Chip size="sm" color="success" variant="soft">
                      {t('student.completed')}
                    </Chip>
                  ) : null}
                </div>
              </Card.Header>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('nav.assignments')}</h2>
        <div className="grid gap-2">
          {student.assignments.map((row) => (
            <Card key={row.id} className="p-4">
              <Card.Header>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Card.Title>{row.title}</Card.Title>
                  <StatusChip status={row.status} />
                </div>
                {row.score != null ? (
                  <Card.Description>{row.score}</Card.Description>
                ) : null}
              </Card.Header>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
