import { Alert, Button, Skeleton } from '@heroui/react';
import { useTranslation } from 'react-i18next';

export function QueryLoading({
  variant = 'default',
}: {
  variant?: 'default' | 'dashboard' | 'teacherDashboard' | 'grid' | 'table' | 'subject' | 'assignment' | 'squares';
}) {
  const { t } = useTranslation();
  if (variant === 'dashboard') {
    return (
      <div className="space-y-6" aria-busy="true" aria-label={t('student.loading')}>
        <Skeleton className="h-8 w-2/3 rounded-lg sm:w-1/3" />
        <Skeleton className="h-4 w-1/2 rounded-md" />
        <Skeleton className="h-32 rounded-xl" />
        <div className="grid gap-8 lg:grid-cols-2">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </div>
    );
  }
  if (variant === 'teacherDashboard') {
    return (
      <div className="space-y-6" aria-busy="true" aria-label={t('student.loading')}>
        <Skeleton className="h-8 w-2/3 rounded-lg sm:w-1/3" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-8">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
          <Skeleton className="h-56 rounded-xl" />
        </div>
      </div>
    );
  }
  if (variant === 'subject') {
    return (
      <div className="space-y-6" aria-busy="true" aria-label={t('student.loading')}>
        <Skeleton className="h-8 w-1/3 rounded-lg" />
        <Skeleton className="h-40 rounded-xl" />
        <div className="grid gap-8 lg:grid-cols-2">
          <Skeleton className="h-56 rounded-xl" />
          <Skeleton className="h-56 rounded-xl" />
        </div>
      </div>
    );
  }
  if (variant === 'grid') {
    return (
      <div className="space-y-4" aria-busy="true" aria-label={t('student.loading')}>
        <Skeleton className="h-8 w-1/3 rounded-lg" />
        <div className="grid gap-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    );
  }
  if (variant === 'squares') {
    return (
      <div className="space-y-4" aria-busy="true" aria-label={t('student.loading')}>
        <Skeleton className="h-8 w-1/3 rounded-lg" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {['a', 'b', 'c', 'd'].map((key) => (
            <div key={key} className="overflow-hidden rounded-xl border border-border">
              <Skeleton className="h-24 rounded-none md:h-28" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-2/3 rounded-md" />
                <Skeleton className="h-3 w-1/2 rounded-md" />
                <Skeleton className="h-2 w-full rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (variant === 'table') {
    return (
      <div className="space-y-4" aria-busy="true" aria-label={t('student.loading')}>
        <Skeleton className="h-8 w-1/3 rounded-lg" />
        <Skeleton className="h-4 w-1/2 rounded-md" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }
  if (variant === 'assignment') {
    return (
      <div className="space-y-4" aria-busy="true" aria-label={t('student.loading')}>
        <Skeleton className="h-8 w-1/3 rounded-lg" />
        <Skeleton className="h-4 w-1/2 rounded-md" />
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Skeleton className="order-1 h-64 rounded-xl lg:order-2" />
          <div className="order-2 lg:order-1">
            <Skeleton className="h-56 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-3" aria-busy="true" aria-label={t('student.loading')}>
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
        {t('student.retry')}
      </Button>
    </Alert>
  );
}

export function EmptyCard({ children }: { children: string }) {
  return (
    <p className="rounded-xl border border-border bg-surface px-5 py-6 text-sm text-muted">{children}</p>
  );
}
