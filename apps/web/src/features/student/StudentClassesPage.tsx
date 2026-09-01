import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { StudentSubjectListItem } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from './QueryState';
import { StudentEmptyState, StudentPageHeader, StudentProgress } from './StudentChrome';
import { BookTextIcon, type BookTextIconHandle } from '@/components/icons/book-text';
import { cn } from '@/lib/cn';

function subjectMeta(subject: StudentSubjectListItem) {
  return [subject.code, subject.className, subject.teacherName].filter(Boolean).join(' · ');
}

function ClassCard({ subject }: { subject: StudentSubjectListItem }) {
  const { t } = useTranslation();
  const iconRef = useRef<BookTextIconHandle>(null);

  return (
    <Link
      to={`/student/classes/${subject.id}`}
      className="rounded-xl text-start text-inherit no-underline"
      onMouseEnter={() => iconRef.current?.startAnimation()}
      onMouseLeave={() => iconRef.current?.stopAnimation()}
    >
      <div className="overflow-hidden rounded-xl border border-border transition-colors hover:border-accent/40">
        <div className="flex h-24 items-center justify-center bg-accent/10 text-accent md:h-28">
          <BookTextIcon ref={iconRef} size={32} aria-hidden />
        </div>
        <div className="space-y-2 p-4">
          <p className="text-base font-semibold leading-snug [overflow-wrap:anywhere]">{subject.name}</p>
          <p className="line-clamp-2 text-sm text-muted">{subjectMeta(subject)}</p>
          <div className="flex items-center gap-2 pt-1">
            <StudentProgress
              value={subject.progressPercent}
              label={t('student.progress', { percent: subject.progressPercent })}
            />
            <span
              className={cn(
                'shrink-0 text-xs tabular-nums text-muted',
                subject.progressPercent >= 100 && 'text-accent',
              )}
            >
              {t('student.progressShort', { percent: subject.progressPercent })}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function StudentClassesPage() {
  const { t } = useTranslation();
  const query = useQuery({
    queryKey: ['student-subjects'],
    queryFn: () => apiFetch<StudentSubjectListItem[]>('/me/subjects'),
  });

  if (query.isLoading) return <QueryLoading variant="squares" />;
  if (query.isError || !query.data) return <QueryError onRetry={() => void query.refetch()} />;

  return (
    <div className="space-y-6">
      <StudentPageHeader title={t('nav.myClasses')} />
      {query.data.length === 0 ? (
        <StudentEmptyState icon={BookTextIcon}>{t('student.emptySubjects')}</StudentEmptyState>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {query.data.map((subject) => (
            <ClassCard key={subject.id} subject={subject} />
          ))}
        </div>
      )}
    </div>
  );
}
