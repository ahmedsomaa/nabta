import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, Chip } from '@heroui/react';
import type { PlatformOverview } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { EmptyCard, QueryError, QueryLoading } from '@/components/QueryState';

export function OverviewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const overview = useQuery({
    queryKey: ['platform-overview'],
    queryFn: () => apiFetch<PlatformOverview>('/platform/overview'),
  });

  if (overview.isLoading) return <QueryLoading />;
  if (overview.isError || !overview.data) {
    return <QueryError onRetry={() => void overview.refetch()} />;
  }

  const data = overview.data;
  const healthLabel =
    data.health.status === 'ok' ? t('platform.healthOk') : t('platform.healthDegraded');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('platform.overviewTitle')}</h1>
        <p className="text-sm text-muted">{t('platform.overviewLead')}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label={t('platform.metricSchools')}
          value={String(data.schools)}
          onPress={() => navigate('/schools')}
        />
        <MetricCard label={t('platform.metricStudents')} value={String(data.students)} />
        <MetricCard label={t('platform.metricTeachers')} value={String(data.teachers)} />
        <MetricCard label={t('platform.metricAdmins')} value={String(data.schoolAdmins)} />
      </div>

      <button type="button" className="w-full rounded-xl text-start" onClick={() => navigate('/system')}>
        <Card className="p-4 transition-colors hover:border-accent/40">
          <Card.Header>
            <Card.Description>{t('platform.health')}</Card.Description>
            <Card.Title className="flex items-center gap-2 text-2xl">
              {healthLabel}
              <Chip
                size="sm"
                variant="soft"
                color={data.health.status === 'ok' ? 'success' : 'warning'}
              >
                {data.health.status}
              </Chip>
            </Card.Title>
          </Card.Header>
        </Card>
      </button>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('platform.schoolsPreview')}</h2>
        {data.schoolsPreview.length === 0 ? (
          <EmptyCard>{t('platform.emptySchools')}</EmptyCard>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {data.schoolsPreview.map((school) => (
              <li key={school.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-4 py-3 text-start text-sm hover:bg-overlay"
                  onClick={() => navigate('/schools')}
                >
                  <span className="font-medium">{school.name}</span>
                  <span className="text-muted">{school.slug}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const card = (
    <Card className={`h-full p-4${onPress ? ' transition-colors hover:border-accent/40' : ''}`}>
      <Card.Header>
        <Card.Description>{label}</Card.Description>
        <Card.Title className="text-2xl">{value}</Card.Title>
      </Card.Header>
    </Card>
  );
  if (!onPress) return card;
  return (
    <button type="button" className="rounded-xl text-start" onClick={onPress}>
      {card}
    </button>
  );
}
