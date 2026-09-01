import type { LucideIcon } from 'lucide-react';
import { ClipboardList, FileQuestion } from 'lucide-react';
import { Button, Card } from '@heroui/react';
import { IconWell } from './StudentChrome';
import { QuizStatusChip, StatusChip, type DueUrgency, urgencyClass } from './StatusChip';
import type { StudentAssessmentStatus, StudentAssignmentStatus } from '@nabta/types';
import { cn } from '@/lib/cn';

export function WorkItemCard({
  kind,
  title,
  subtitle,
  status,
  urgency = 'none',
  onPress,
  ctaLabel,
  showIcon = true,
}: {
  kind: 'assignment' | 'assessment';
  title: string;
  subtitle: string;
  status: string;
  urgency?: DueUrgency;
  onPress: () => void;
  ctaLabel?: string;
  showIcon?: boolean;
}) {
  const icon: LucideIcon = kind === 'assessment' ? FileQuestion : ClipboardList;
  const chip =
    kind === 'assessment' ? (
      <QuizStatusChip status={status as StudentAssessmentStatus} />
    ) : (
      <StatusChip status={status as StudentAssignmentStatus} />
    );

  const card = (
    <Card className={cn('h-full p-4 transition-colors hover:border-accent/40', urgencyClass(urgency))}>
      <Card.Header>
        <div className="flex items-start gap-3">
          {showIcon ? <IconWell icon={icon} /> : null}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <Card.Title>{title}</Card.Title>
              {chip}
            </div>
            <Card.Description>{subtitle}</Card.Description>
          </div>
        </div>
      </Card.Header>
      {ctaLabel ? (
        <div className={cn('mt-3', showIcon && 'ps-[3.25rem]')}>
          <Button size="sm" variant="secondary" onPress={onPress}>
            {ctaLabel}
          </Button>
        </div>
      ) : null}
    </Card>
  );

  if (ctaLabel) return card;

  return (
    <button type="button" className="h-full w-full rounded-xl text-start" onClick={onPress}>
      {card}
    </button>
  );
}
