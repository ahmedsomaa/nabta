import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, Chip } from '@heroui/react';
import type { HealthCheckStatus, PlatformHealth } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from '@/components/QueryState';

export function SystemPage() {
  const { t } = useTranslation();
  const health = useQuery({
    queryKey: ['platform-health'],
    queryFn: () => apiFetch<PlatformHealth>('/health'),
  });

  if (health.isLoading) return <QueryLoading />;
  if (health.isError || !health.data) return <QueryError onRetry={() => void health.refetch()} />;

  const data = health.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('platform.systemTitle')}</h1>
        <p className="text-sm text-muted">{t('platform.systemLead')}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatusCard label={t('platform.api')} value="ok" />
        <StatusCard label={t('platform.database')} value={data.database} />
        <StatusCard label={t('platform.redis')} value={data.redis} />
      </div>
      <Card className="p-4">
        <Card.Header>
          <Card.Description>{t('platform.health')}</Card.Description>
          <Card.Title className="flex items-center gap-2">
            {data.status === 'ok' ? t('platform.healthOk') : t('platform.healthDegraded')}
            <Chip size="sm" variant="soft" color={data.status === 'ok' ? 'success' : 'warning'}>
              {data.status}
            </Chip>
          </Card.Title>
        </Card.Header>
      </Card>
    </div>
  );
}

function StatusCard({ label, value }: { label: string; value: HealthCheckStatus }) {
  const { t } = useTranslation();
  return (
    <Card className="p-4">
      <Card.Header>
        <Card.Description>{label}</Card.Description>
        <Card.Title className="flex items-center gap-2 text-2xl">
          {value === 'ok' ? t('platform.healthOk') : t('platform.healthDown')}
          <Chip size="sm" variant="soft" color={value === 'ok' ? 'success' : 'danger'}>
            {value}
          </Chip>
        </Card.Title>
      </Card.Header>
    </Card>
  );
}
