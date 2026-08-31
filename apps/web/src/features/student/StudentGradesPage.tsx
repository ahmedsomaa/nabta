import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button, Card } from '@heroui/react';
import type { StudentGradeDetail, StudentGradeListItem } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { EmptyCard, QueryError, QueryLoading } from './QueryState';

export function StudentGradesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { subjectId } = useParams();
  const list = useQuery({
    queryKey: ['student-grades'],
    queryFn: () => apiFetch<StudentGradeListItem[]>('/me/grades'),
  });
  const detail = useQuery({
    queryKey: ['student-grades', subjectId],
    queryFn: () => apiFetch<StudentGradeDetail>(`/me/grades/${subjectId}`),
    enabled: Boolean(subjectId),
  });

  if (list.isLoading) return <QueryLoading />;
  if (list.isError || !list.data) return <QueryError onRetry={() => void list.refetch()} />;

  if (subjectId) {
    if (detail.isLoading) return <QueryLoading />;
    if (detail.isError || !detail.data) return <QueryError onRetry={() => void detail.refetch()} />;
    const row = detail.data;
    return (
      <div className="space-y-6">
        <Button variant="tertiary" onPress={() => navigate('/student/grades')}>
          {t('grades.title')}
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">
          {row.subjectName} · {row.className}
        </h1>
        <p className="text-sm">
          {t('grades.current')}:{' '}
          {row.percentage == null
            ? t('grades.noScore')
            : `${row.percentage}% (${row.letter ?? t('grades.noScore')})`}
        </p>
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t('grades.assignments')}</h2>
          {row.assignments.length === 0 ? (
            <EmptyCard>{t('student.emptyAssignments')}</EmptyCard>
          ) : (
            row.assignments.map((item) => (
              <Card key={item.id}>
                <Card.Header>
                  <Card.Title>{item.title}</Card.Title>
                  <Card.Description>
                    {item.score == null ? t('grades.noScore') : `${item.score} / ${item.maxScore}`}
                  </Card.Description>
                </Card.Header>
                {item.feedback ? <p className="px-4 pb-4 text-sm">{item.feedback}</p> : null}
              </Card>
            ))
          )}
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t('grades.quizzes')}</h2>
          {row.assessments.length === 0 ? (
            <EmptyCard>{t('assessment.empty')}</EmptyCard>
          ) : (
            row.assessments.map((item) => (
              <Card key={item.id}>
                <Card.Header>
                  <Card.Title>{item.title}</Card.Title>
                  <Card.Description>
                    {item.score == null ? t('grades.noScore') : `${item.score} / ${item.maxScore}`}
                  </Card.Description>
                </Card.Header>
                <div className="px-4 pb-4">
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={() => navigate(`/student/assessments/${item.id}`)}
                  >
                    {t('assessment.viewQuiz')}
                  </Button>
                </div>
              </Card>
            ))
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t('grades.title')}</h1>
      {list.data.length === 0 ? (
        <EmptyCard>{t('grades.empty')}</EmptyCard>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[28rem] text-start text-sm">
            <thead className="bg-surface text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">{t('nav.myClasses')}</th>
                <th className="px-4 py-2 font-medium">{t('grades.current')}</th>
                <th className="px-4 py-2 font-medium">{t('grades.letter')}</th>
              </tr>
            </thead>
            <tbody>
              {list.data.map((row) => (
                <tr
                  key={row.subjectId}
                  className="cursor-pointer border-t border-border hover:bg-overlay"
                  onClick={() => navigate(`/student/grades/${row.subjectId}`)}
                >
                  <td className="px-4 py-3">
                    {row.subjectName} · {row.className}
                  </td>
                  <td className="px-4 py-3">
                    {row.percentage == null ? t('grades.noScore') : `${row.percentage}%`}
                  </td>
                  <td className="px-4 py-3">{row.letter ?? t('grades.noScore')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
