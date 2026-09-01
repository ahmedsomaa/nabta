import { Alert, Button, Skeleton } from '@heroui/react';
import { useTranslation } from 'react-i18next';

export function QueryLoading() {
  const { t } = useTranslation();
  return (
    <div className="space-y-3" aria-busy="true" aria-label={t('platform.loading')}>
      <Skeleton className="h-8 w-1/3 rounded-lg" />
      <Skeleton className="h-28 rounded-xl" />
      <Skeleton className="h-28 rounded-xl" />
    </div>
  );
}

export function QueryError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <Alert status="danger">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{t('errors.generic')}</Alert.Title>
      </Alert.Content>
      <Button size="sm" variant="danger" onPress={onRetry}>
        {t('platform.retry')}
      </Button>
    </Alert>
  );
}

export function EmptyCard({ children }: { children: string }) {
  return (
    <p className="rounded-xl border border-border bg-surface px-5 py-6 text-sm text-muted">{children}</p>
  );
}
