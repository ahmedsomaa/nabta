import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { TeacherClassItem } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from './QueryState';
import { PortalEmptyState, PortalPageHeader } from '@/components/portal/PortalChrome';
import { BookTextIcon, type BookTextIconHandle } from '@/components/icons/book-text';

function ClassCard({ item }: { item: TeacherClassItem }) {
  const iconRef = useRef<BookTextIconHandle>(null);

  return (
    <Link
      to={`/teacher/classes/${item.classId}/${item.subjectId}`}
      className="rounded-xl text-start text-inherit no-underline"
      onMouseEnter={() => iconRef.current?.startAnimation()}
      onMouseLeave={() => iconRef.current?.stopAnimation()}
    >
      <div className="overflow-hidden rounded-xl border border-border transition-colors hover:border-accent/40">
        <div className="flex h-24 items-center justify-center bg-accent/10 text-accent md:h-28">
          <BookTextIcon ref={iconRef} size={32} aria-hidden />
        </div>
        <div className="space-y-1 p-4">
          <p className="text-base font-semibold leading-snug [overflow-wrap:anywhere]">{item.subjectName}</p>
          <p className="text-sm text-muted">{item.className}</p>
        </div>
      </div>
    </Link>
  );
}

export function TeacherClassesPage() {
  const { t } = useTranslation();
  const query = useQuery({
    queryKey: ['teacher-classes'],
    queryFn: () => apiFetch<TeacherClassItem[]>('/teacher/classes'),
  });

  if (query.isLoading) return <QueryLoading variant="squares" />;
  if (query.isError || !query.data) return <QueryError onRetry={() => void query.refetch()} />;

  return (
    <div className="space-y-4">
      <PortalPageHeader title={t('nav.classes')} />
      {query.data.length === 0 ? (
        <PortalEmptyState icon={BookTextIcon}>{t('teacher.emptyClasses')}</PortalEmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {query.data.map((item) => (
            <ClassCard key={`${item.classId}-${item.subjectId}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
