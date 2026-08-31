import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Card } from '@heroui/react';
import type { StudentAssessmentStatus, StudentAssignmentStatus, StudentDashboard, StudentGradeListItem, StudentMe } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { EmptyCard, QueryError, QueryLoading } from './QueryState';
import { QuizStatusChip, StatusChip, formatDue } from './StatusChip';

function greetingKey(hour: number) {
  if (hour < 12) return 'student.greetingMorning';
  if (hour < 17) return 'student.greetingAfternoon';
  return 'student.greetingEvening';
}

export function StudentDashboardPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const me = useQuery({ queryKey: ['student-me'], queryFn: () => apiFetch<StudentMe>('/me') });
  const dash = useQuery({
    queryKey: ['student-dashboard'],
    queryFn: () => apiFetch<StudentDashboard>('/me/dashboard'),
  });
  const grades = useQuery({
    queryKey: ['student-grades'],
    queryFn: () => apiFetch<StudentGradeListItem[]>('/me/grades'),
  });

  if (me.isLoading || dash.isLoading) return <QueryLoading />;
  if (me.isError || dash.isError || !me.data || !dash.data) {
    return (
      <QueryError
        onRetry={() => {
          void me.refetch();
          void dash.refetch();
        }}
      />
    );
  }

  const hour = new Date().getHours();
  const data = dash.data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t(greetingKey(hour), { name: me.data.givenName })}
      </h1>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('student.todaySchedule')}</h2>
        {data.schedule.length === 0 ? (
          <EmptyCard>{t('student.emptySchedule')}</EmptyCard>
        ) : (
          <div className="grid gap-3">
            {data.schedule.map((slot) => (
              <Card key={slot.id} className="p-4">
                <Card.Header>
                  <Card.Title>
                    {slot.startsAt}–{slot.endsAt} · {slot.subjectName}
                  </Card.Title>
                  {slot.room ? (
                    <Card.Description>{t('student.room', { room: slot.room })}</Card.Description>
                  ) : null}
                </Card.Header>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('student.upcoming')}</h2>
        {data.upcoming.length === 0 ? (
          <EmptyCard>{t('student.emptyUpcoming')}</EmptyCard>
        ) : (
          <div className="grid gap-3">
            {data.upcoming.map((item) => {
              const isQuiz = item.kind === 'assessment';
              return (
                <Card key={`${item.kind ?? 'assignment'}-${item.id}`} className="p-4">
                  <Card.Header>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <Card.Title>{item.title}</Card.Title>
                        <Card.Description>
                          {item.subjectName}
                          {item.dueAt
                            ? ` · ${t('student.due', { date: formatDue(item.dueAt, i18n.language) })}`
                            : ` · ${t('assessment.overview')}`}
                        </Card.Description>
                      </div>
                      {isQuiz ? (
                        <QuizStatusChip status={item.status as StudentAssessmentStatus} />
                      ) : (
                        <StatusChip status={item.status as StudentAssignmentStatus} />
                      )}
                    </div>
                  </Card.Header>
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={() =>
                        navigate(
                          isQuiz ? `/student/assessments/${item.id}` : `/student/assignments/${item.id}`,
                        )
                      }
                    >
                      {isQuiz ? t('assessment.viewQuiz') : t('student.viewAssignment')}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('student.continueLearning')}</h2>
        {data.continueLearning ? (
          <Card className="p-4">
            <Card.Header>
              <Card.Title>{data.continueLearning.lessonTitle}</Card.Title>
              <Card.Description>{data.continueLearning.subjectName}</Card.Description>
            </Card.Header>
            <div className="mt-3">
              <Button
                size="sm"
                variant="primary"
                onPress={() =>
                  navigate(
                    `/student/classes/${data.continueLearning!.subjectId}/lessons/${data.continueLearning!.lessonId}`,
                  )
                }
              >
                {t('student.openLesson')}
              </Button>
            </div>
          </Card>
        ) : (
          <EmptyCard>{t('student.emptyContinue')}</EmptyCard>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('student.overview')}</h2>
        <Card className="p-4">
          <Card.Header>
            <Card.Description>
              {t('student.submittedCount', {
                submitted: data.overview.submitted,
                total: data.overview.total,
              })}
            </Card.Description>
          </Card.Header>
          {grades.data?.some((row) => row.percentage != null) ? (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {grades.data
                .filter((row) => row.percentage != null)
                .slice(0, 3)
                .map((row) => (
                  <p key={row.subjectId} className="text-sm">
                    {row.subjectName}: {row.percentage}%{row.letter ? ` (${row.letter})` : ''}
                  </p>
                ))}
              <Button size="sm" variant="tertiary" onPress={() => navigate('/student/grades')}>
                {t('grades.title')}
              </Button>
            </div>
          ) : null}
        </Card>
      </section>
    </div>
  );
}
