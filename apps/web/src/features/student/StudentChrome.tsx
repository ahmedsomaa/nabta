import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button, ProgressBar } from '@heroui/react';
import { cn } from '@/lib/cn';

const wellTone = {
  accent: 'bg-accent/10 text-accent',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger/15 text-danger',
  success: 'bg-success/15 text-success',
} as const;

export function IconWell({
  icon: Icon,
  tone = 'accent',
  className,
}: {
  icon: LucideIcon;
  tone?: keyof typeof wellTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex size-10 shrink-0 items-center justify-center rounded-xl',
        wellTone[tone],
        className,
      )}
    >
      <Icon className="size-5" aria-hidden />
    </span>
  );
}

export function StudentPageHeader({
  title,
  subtitle,
  trailing,
}: {
  title: string;
  subtitle?: ReactNode;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight [overflow-wrap:anywhere]">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {trailing}
    </div>
  );
}

export function StudentEmptyState({
  icon: Icon,
  children,
  action,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: string;
  action?: { label: string; onPress: () => void };
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface px-5 py-10 text-center">
      <div className="text-accent">
        <Icon className="mx-auto" size={32} />
      </div>
      <p className="max-w-sm text-sm text-muted">{children}</p>
      {action ? (
        <Button size="sm" variant="secondary" onPress={action.onPress}>
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}

export function StudentPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('overflow-hidden rounded-xl border border-border p-5', className)}>{children}</div>
  );
}

export function StudentList({ children }: { children: ReactNode }) {
  return <ul className="overflow-hidden rounded-xl border border-border">{children}</ul>;
}

export function StudentProgress({ value, label }: { value: number; label: string }) {
  const percent = Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));
  return (
    <ProgressBar
      aria-label={label}
      className="w-full min-w-0"
      color="accent"
      formatOptions={{ style: 'decimal', maximumFractionDigits: 0 }}
      maxValue={100}
      minValue={0}
      size="sm"
      value={percent}
    >
      <ProgressBar.Track>
        <ProgressBar.Fill />
      </ProgressBar.Track>
    </ProgressBar>
  );
}

export function StudentMetric({
  label,
  value,
  icon,
  tone = 'accent',
  onPress,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: keyof typeof wellTone;
  onPress?: () => void;
}) {
  const body = (
    <div className="flex h-full items-start gap-3 p-4">
      <IconWell icon={icon} tone={tone} />
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted">{label}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      </div>
    </div>
  );
  if (!onPress) {
    return <div className="rounded-xl border border-border bg-overlay">{body}</div>;
  }
  return (
    <button
      type="button"
      className="rounded-xl border border-border bg-overlay text-start transition-colors hover:border-accent/40"
      onClick={onPress}
    >
      {body}
    </button>
  );
}
