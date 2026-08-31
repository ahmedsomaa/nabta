import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Card } from '@heroui/react';
import type { TeacherDashboard, TeacherMe } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { EmptyCard, QueryError, QueryLoading } from './QueryState';

function greetingKey(hour: number) {
  if (hour < 12) return 'teacher.greetingMorning';
  if (hour < 17) return 'teacher.greetingAfternoon';
  return 'teacher.greetingEvening';
}

export function TeacherDashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const me = useQuery({ queryKey: ['teacher-me'], queryFn: () => apiFetch<TeacherMe>('/teacher/me') });
  const dash = useQuery({
    queryKey: ['teacher-dashboard'],
    queryFn: () => apiFetch<TeacherDashboard>('/teacher/dashboard'),
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

  const firstClass = dash.data.schedule[0];
  const hour = new Date().getHours();
  const data = dash.data;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {t(greetingKey(hour), { name: me.data.givenName })}
      </h1>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('teacher.quickActions')}</h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onPress={() => navigate('/teacher/assignments/new')}>
            {t('teacher.createAssignment')}
          </Button>
          <Button
            variant="secondary"
            isDisabled={!firstClass}
            onPress={() =>
              firstClass &&
              navigate(`/teacher/classes/${firstClass.classId}/${firstClass.subjectId}/builder`)
            }
          >
            {t('teacher.uploadMaterial')}
          </Button>
          <Button
            variant="secondary"
            isDisabled={!firstClass}
            onPress={() =>
              firstClass &&
              navigate(`/teacher/classes/${firstClass.classId}/${firstClass.subjectId}/attendance`)
            }
          >
            {t('teacher.takeAttendance')}
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('teacher.todayClasses')}</h2>
        {data.schedule.length === 0 ? (
          <EmptyCard>{t('teacher.emptySchedule')}</EmptyCard>
        ) : (
          <div className="grid gap-3">
            {data.schedule.map((slot) => (
              <button
                key={slot.id}
                type="button"
                className="rounded-xl text-start"
                onClick={() => navigate(`/teacher/classes/${slot.classId}/${slot.subjectId}`)}
              >
                <Card className="p-4 transition-colors hover:border-accent/40">
                  <Card.Header>
                    <Card.Title>
                      {slot.startsAt}–{slot.endsAt} · {slot.className} — {slot.subjectName}
                    </Card.Title>
                    {slot.room ? (
                      <Card.Description>{t('teacher.room', { room: slot.room })}</Card.Description>
                    ) : null}
                  </Card.Header>
                </Card>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('teacher.toGrade')}</h2>
        {data.toGrade.length === 0 ? (
          <EmptyCard>{t('teacher.emptyToGrade')}</EmptyCard>
        ) : (
          <div className="grid gap-3">
            {data.toGrade.map((item) => (
              <Card key={item.assignmentId} className="p-4">
                <Card.Header>
                  <Card.Title>{item.title}</Card.Title>
                  <Card.Description>
                    {item.className} · {item.subjectName} ·{' '}
                    {t('teacher.pendingCount', { count: item.pending })}
                  </Card.Description>
                </Card.Header>
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    onPress={() => navigate(`/teacher/assignments/${item.assignmentId}/submissions`)}
                  >
                    {t('teacher.submissions')}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('teacher.alerts')}</h2>
        {data.alerts.length === 0 ? (
          <EmptyCard>{t('teacher.emptyAlerts')}</EmptyCard>
        ) : (
          <div className="grid gap-3">
            {data.alerts.map((alert) => (
              <button
                key={`${alert.kind}-${alert.classId}-${alert.subjectId}`}
                type="button"
                className="rounded-xl text-start"
                onClick={() => navigate(`/teacher/classes/${alert.classId}/${alert.subjectId}`)}
              >
                <Card className="p-4 transition-colors hover:border-accent/40">
                  <Card.Header>
                    <Card.Title>{alert.message}</Card.Title>
                  </Card.Header>
                </Card>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
