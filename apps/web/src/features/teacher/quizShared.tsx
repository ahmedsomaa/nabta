import type { QuestionType, TeacherAssessmentListItem, TeacherQuizStatus } from '@nabta/types';
import { AssignmentInstructions, stripAssignmentHtml } from './assignmentShared';
import { cn } from '@/lib/cn';

/** Keep in sync with `UNTITLED_QUIZ_TITLE` in `packages/validation`. */
export const UNTITLED_QUIZ_TITLE = 'Untitled quiz';

export const QUIZ_TYPES: QuestionType[] = [
  'MULTIPLE_CHOICE',
  'MULTIPLE_ANSWER',
  'TRUE_FALSE',
  'SHORT_ANSWER',
];

export function quizStatus(item: {
  publishedAt: string | null;
  opensAt?: string | null;
  dueAt?: string | null;
}, now = new Date()): TeacherQuizStatus {
  if (!item.publishedAt) return 'draft';
  if (item.opensAt && new Date(item.opensAt) > now) return 'scheduled';
  if (item.dueAt && new Date(item.dueAt) < now) return 'closed';
  return 'active';
}

export function quizStatusChipColor(status: TeacherQuizStatus): 'default' | 'accent' | 'success' | 'warning' {
  if (status === 'draft') return 'default';
  if (status === 'scheduled') return 'accent';
  if (status === 'active') return 'success';
  return 'warning';
}

export function quizPromptPreview(html: string, fallback = '') {
  return stripAssignmentHtml(html) || fallback;
}

export function QuizHtml({ html, className }: { html: string; className?: string }) {
  return <AssignmentInstructions html={html} className={className} />;
}

export function formatDuration(seconds: number | null | undefined) {
  if (seconds == null) return '';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function estimatedMinutes(questionCount: number, timeLimitMinutes: number | null) {
  if (timeLimitMinutes != null) return timeLimitMinutes;
  return Math.max(1, questionCount * 2);
}

export function listHref(item: TeacherAssessmentListItem) {
  return item.publishedAt ? `/teacher/assessments/${item.id}` : `/teacher/assessments/${item.id}/edit`;
}

export function toDateInput(iso: string | null | undefined) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDatetimeLocal(value: string) {
  if (!value) return null;
  const stamp = new Date(value);
  if (Number.isNaN(stamp.getTime())) return null;
  return stamp.toISOString();
}

export function QuizStudentQuestion({
  index,
  total,
  type,
  prompt,
  options,
  className,
}: {
  index: number;
  total: number;
  type: QuestionType;
  prompt: string;
  options: { id: string; text: string }[];
  className?: string;
}) {
  return (
    <div className={cn('space-y-3 overflow-hidden rounded-xl border border-border bg-surface p-4', className)}>
      <p className="text-sm font-medium text-muted">
        {index + 1} / {total}
      </p>
      <QuizHtml html={prompt} className="font-medium" />
      {type === 'SHORT_ANSWER' ? (
        <div className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted">…</div>
      ) : (
        <ul className="space-y-2">
          {options.map((option) => (
            <li
              key={option.id}
              className="flex items-center gap-2 rounded-xl border border-border px-3 py-3 text-sm"
            >
              <span
                className={cn(
                  'size-4 shrink-0 border border-foreground/30',
                  type === 'MULTIPLE_ANSWER' ? 'rounded-sm' : 'rounded-full',
                )}
              />
              <span>{option.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
