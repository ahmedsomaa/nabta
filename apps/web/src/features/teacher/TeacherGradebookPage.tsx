import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BookOpen, ClipboardList } from 'lucide-react';
import type { TeacherClassItem, TeacherGradebook } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from './QueryState';
import { PortalEmptyState, PortalPageHeader } from '@/components/portal/PortalChrome';
import { usePageTrail } from '@/layouts/PageTrail';

export function TeacherGradebookPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { classId, subjectId } = useParams();
  const classes = useQuery({
    queryKey: ['teacher-classes'],
    queryFn: () => apiFetch<TeacherClassItem[]>('/teacher/classes'),
  });

  const selected = classId && subjectId ? { classId, subjectId } : classes.data?.[0];
  const book = useQuery({
    queryKey: ['teacher-gradebook', selected?.classId, selected?.subjectId],
    queryFn: () =>
      apiFetch<TeacherGradebook>(
        `/teacher/gradebook?classId=${selected!.classId}&subjectId=${selected!.subjectId}`,
      ),
    enabled: Boolean(selected?.classId && selected?.subjectId),
  });

  const selectedClass = classes.data?.find(
    (item) => item.classId === selected?.classId && item.subjectId === selected?.subjectId,
  );
  usePageTrail(
    selectedClass ? [{ label: `${selectedClass.className} · ${selectedClass.subjectName}` }] : [],
  );

  if (classes.isLoading) return <QueryLoading variant="table" />;
  if (classes.isError || !classes.data) return <QueryError onRetry={() => void classes.refetch()} />;
  if (classes.data.length === 0) {
    return (
      <div className="space-y-4">
        <PortalPageHeader title={t('nav.gradebook')} />
        <PortalEmptyState icon={BookOpen}>{t('teacher.emptyClasses')}</PortalEmptyState>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PortalPageHeader title={t('nav.gradebook')} />
      <div className="flex flex-wrap gap-2">
        {classes.data.map((item) => (
          <button
            key={`${item.classId}-${item.subjectId}`}
            type="button"
            className={`rounded-lg border px-3 py-1.5 text-sm ${
              selected?.classId === item.classId && selected?.subjectId === item.subjectId
                ? 'border-accent bg-accent/10'
                : 'border-border'
            }`}
            onClick={() => navigate(`/teacher/gradebook/${item.classId}/${item.subjectId}`)}
          >
            {item.className} · {item.subjectName}
          </button>
        ))}
      </div>
      {book.isLoading ? (
        <QueryLoading variant="table" />
      ) : book.isError || !book.data ? (
        <QueryError onRetry={() => void book.refetch()} />
      ) : book.data.assignments.length === 0 && book.data.assessments.length === 0 ? (
        <PortalEmptyState icon={ClipboardList}>{t('teacher.emptyAssignments')}</PortalEmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[40rem] text-start text-sm [&_td]:text-start [&_th]:text-start">
            <thead className="bg-surface text-muted">
              <tr>
                <th className="px-4 py-2 text-start font-medium">{t('teacher.student')}</th>
                {book.data.assignments.map((assignment) => (
                  <th key={assignment.id} className="px-4 py-2 text-start font-medium">
                    <Link
                      to={`/teacher/assignments/${assignment.id}/submissions`}
                      className="text-accent no-underline"
                    >
                      {assignment.title}
                    </Link>
                  </th>
                ))}
                {book.data.assessments.map((assessment) => (
                  <th key={assessment.id} className="px-4 py-2 text-start font-medium">
                    <Link
                      to={`/teacher/assessments/${assessment.id}/results`}
                      className="text-accent no-underline"
                    >
                      {assessment.title}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {book.data.students.map((student) => (
                <tr key={student.id} className="border-t border-border">
                  <td className="px-4 py-3">
                    {student.givenName} {student.familyName}
                  </td>
                  {book.data.assignments.map((assignment) => {
                    const cell = book.data.cells.find(
                      (row) => row.studentId === student.id && row.assignmentId === assignment.id,
                    );
                    return (
                      <td key={assignment.id} className="px-4 py-3">
                        {cell?.score != null ? cell.score : t('teacher.noGrade')}
                      </td>
                    );
                  })}
                  {book.data.assessments.map((assessment) => {
                    const cell = book.data.assessmentCells.find(
                      (row) => row.studentId === student.id && row.assessmentId === assessment.id,
                    );
                    return (
                      <td key={assessment.id} className="px-4 py-3">
                        {cell?.score != null ? cell.score : t('teacher.noGrade')}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
