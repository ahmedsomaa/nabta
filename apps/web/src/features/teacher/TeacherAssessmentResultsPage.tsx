import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button, Card, Chip } from '@heroui/react';
import type { TeacherAssessmentResults, TeacherAttemptReview } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { EmptyCard, QueryError, QueryLoading } from './QueryState';
import { useState } from 'react';

export function TeacherAssessmentResultsPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const [openId, setOpenId] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ['teacher-assessment-results', id],
    queryFn: () => apiFetch<TeacherAssessmentResults>(`/teacher/assessments/${id}/results`),
    enabled: Boolean(id),
  });
  const review = useQuery({
    queryKey: ['teacher-attempt', id, openId],
    queryFn: () => apiFetch<TeacherAttemptReview>(`/teacher/assessments/${id}/attempts/${openId}`),
    enabled: Boolean(id && openId),
  });

  if (query.isLoading) return <QueryLoading />;
  if (query.isError || !query.data) return <QueryError onRetry={() => void query.refetch()} />;

  const data = query.data;

  return (
    <div className="space-y-6">
      <Link to={`/teacher/assessments/${id}`} className="text-sm text-muted no-underline hover:text-accent">
        {t('nav.quizzes')}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">
        {data.title} · {t('teacher.results')}
      </h1>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <Card.Description>{t('teacher.attemptCount', { count: data.attemptCount })}</Card.Description>
        </Card>
        <Card className="p-4">
          <Card.Description>
            {t('teacher.average')}: {data.average == null ? t('teacher.noGrade') : data.average}
          </Card.Description>
        </Card>
        <Card className="p-4">
          <Card.Description>
            {t('teacher.passRate')}: {data.passRate == null ? t('teacher.noGrade') : `${data.passRate}%`}
          </Card.Description>
        </Card>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[32rem] text-start text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">{t('teacher.student')}</th>
              <th className="px-4 py-2 font-medium">{t('teacher.score')}</th>
              <th className="px-4 py-2 font-medium">{t('teacher.results')}</th>
            </tr>
          </thead>
          <tbody>
            {data.students.map((row) => (
              <tr key={row.studentId} className="border-t border-border">
                <td className="px-4 py-3">
                  {row.givenName} {row.familyName}
                </td>
                <td className="px-4 py-3">
                  {row.bestScore == null ? t('teacher.noGrade') : `${row.bestScore} / ${row.maxScore}`}
                  {row.passed === true ? (
                    <Chip size="sm" color="success" variant="soft" className="ms-2">
                      {t('teacher.passed')}
                    </Chip>
                  ) : null}
                  {row.passed === false ? (
                    <Chip size="sm" color="danger" variant="soft" className="ms-2">
                      {t('teacher.failed')}
                    </Chip>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  {row.attemptId ? (
                    <Button size="sm" variant="secondary" onPress={() => setOpenId(row.attemptId)}>
                      {t('teacher.open')}
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {openId && review.data ? (
        <Card className="space-y-3 p-4">
          <Card.Title>
            {review.data.givenName} {review.data.familyName}
          </Card.Title>
          {review.data.questions.map((question) => (
            <div key={question.id} className="rounded-lg border border-border p-3 text-sm">
              <p className="font-medium">{question.prompt}</p>
              <p className="mt-1 text-muted">
                {question.correct ? t('assessment.correct') : t('assessment.incorrect')}
              </p>
              {question.textAnswer ? <p>{question.textAnswer}</p> : null}
              {question.feedback ? <p className="mt-2">{question.feedback}</p> : null}
            </div>
          ))}
        </Card>
      ) : null}
      {query.data.students.length === 0 ? <EmptyCard>{t('teacher.emptyRoster')}</EmptyCard> : null}
    </div>
  );
}
