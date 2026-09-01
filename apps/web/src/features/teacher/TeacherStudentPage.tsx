import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BookOpen, ClipboardList } from 'lucide-react';
import { Chip } from '@heroui/react';
import type { TeacherStudentOverview } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { StatusChip } from '@/features/student/StatusChip';
import { QueryError, QueryLoading } from './QueryState';
import {
  PortalEmptyState,
  PortalList,
  PortalPageHeader,
  portalListRowClass,
} from '@/components/portal/PortalChrome';
import { usePageTrail } from '@/layouts/PageTrail';

export function TeacherStudentPage() {
  const { t } = useTranslation();
  const { classId = '', subjectId = '', studentId = '' } = useParams();
  const query = useQuery({
    queryKey: ['teacher-student', classId, subjectId, studentId],
    queryFn: () =>
      apiFetch<TeacherStudentOverview>(
        `/teacher/classes/${classId}/subjects/${subjectId}/students/${studentId}`,
      ),
    enabled: Boolean(classId && subjectId && studentId),
  });

  usePageTrail(
    query.data
      ? [
          {
            label: t('nav.classes'),
            to: `/teacher/classes/${classId}/${subjectId}`,
          },
          { label: `${query.data.givenName} ${query.data.familyName}` },
        ]
      : [],
  );

  if (query.isLoading) return <QueryLoading variant="grid" />;
  if (query.isError || !query.data) return <QueryError onRetry={() => void query.refetch()} />;

  const student = query.data;

  return (
    <div className="space-y-6">
      <PortalPageHeader title={`${student.givenName} ${student.familyName}`} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('student.lessons')}</h2>
        {student.lessons.length === 0 ? (
          <PortalEmptyState icon={BookOpen}>{t('teacher.emptyLessons')}</PortalEmptyState>
        ) : (
          <PortalList>
            {student.lessons.map((lesson) => (
              <li key={lesson.id} className="border-b border-border last:border-b-0">
                <div className={`${portalListRowClass} cursor-default hover:bg-transparent`}>
                  <p className="min-w-0 flex-1 truncate font-medium">{lesson.title}</p>
                  {lesson.completed ? (
                    <Chip size="sm" color="success" variant="soft">
                      {t('student.completed')}
                    </Chip>
                  ) : null}
                </div>
              </li>
            ))}
          </PortalList>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('nav.assignments')}</h2>
        {student.assignments.length === 0 ? (
          <PortalEmptyState icon={ClipboardList}>{t('teacher.emptyAssignments')}</PortalEmptyState>
        ) : (
          <PortalList>
            {student.assignments.map((row) => (
              <li key={row.id} className="border-b border-border last:border-b-0">
                <div className={`${portalListRowClass} cursor-default hover:bg-transparent`}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{row.title}</p>
                    {row.score != null ? (
                      <p className="mt-0.5 truncate text-xs text-muted">{row.score}</p>
                    ) : null}
                  </div>
                  <StatusChip status={row.status} />
                </div>
              </li>
            ))}
          </PortalList>
        )}
      </section>
    </div>
  );
}
