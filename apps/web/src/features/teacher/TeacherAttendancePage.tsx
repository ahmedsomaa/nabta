import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button, toast } from '@heroui/react';
import type { AttendanceStatus, TeacherAttendance } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { EmptyCard, QueryError, QueryLoading } from './QueryState';

const STATUSES: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];

function todayIso() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function TeacherAttendancePage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { classId = '', subjectId = '' } = useParams();
  const [date, setDate] = useState(todayIso());
  const query = useQuery({
    queryKey: ['teacher-attendance', classId, subjectId, date],
    queryFn: () =>
      apiFetch<TeacherAttendance>(
        `/teacher/attendance?classId=${classId}&subjectId=${subjectId}&date=${date}`,
      ),
    enabled: Boolean(classId && subjectId && date),
  });
  const [draft, setDraft] = useState<Record<string, AttendanceStatus>>({});

  const records = useMemo(() => {
    const base: Record<string, AttendanceStatus> = {};
    for (const row of query.data?.records ?? []) {
      if (row.status) base[row.studentId] = row.status;
    }
    return { ...base, ...draft };
  }, [query.data, draft]);

  const save = useMutation({
    mutationFn: () => {
      const payload = (query.data?.records ?? []).map((row) => ({
        studentId: row.studentId,
        status: records[row.studentId] ?? 'PRESENT',
      }));
      return apiFetch('/teacher/attendance', {
        method: 'PUT',
        body: JSON.stringify({ classId, subjectId, date, records: payload }),
      });
    },
    onSuccess: () => {
      toast.success(t('teacher.attendanceSaved'));
      setDraft({});
      void queryClient.invalidateQueries({ queryKey: ['teacher-attendance', classId, subjectId, date] });
    },
  });

  if (query.isLoading) return <QueryLoading />;
  if (query.isError || !query.data) return <QueryError onRetry={() => void query.refetch()} />;

  return (
    <div className="space-y-4">
      <Link
        to={`/teacher/classes/${classId}/${subjectId}`}
        className="text-sm text-muted no-underline hover:text-accent"
      >
        {t('teacher.backToClass')}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">{t('teacher.attendance')}</h1>
      <label className="grid max-w-xs gap-1 text-sm">
        <span>{t('teacher.date')}</span>
        <input
          type="date"
          className="rounded-lg border border-border bg-background px-3 py-2"
          value={date}
          onChange={(event) => {
            setDate(event.target.value);
            setDraft({});
          }}
        />
      </label>
      {query.data.records.length === 0 ? (
        <EmptyCard>{t('teacher.emptyRoster')}</EmptyCard>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[32rem] text-start text-sm">
            <thead className="bg-surface text-muted">
              <tr>
                <th className="px-4 py-2 font-medium">{t('teacher.student')}</th>
                {STATUSES.map((status) => (
                  <th key={status} className="px-4 py-2 font-medium">
                    {t(`teacher.mark${status.charAt(0)}${status.slice(1).toLowerCase()}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {query.data.records.map((row) => (
                <tr key={row.studentId} className="border-t border-border">
                  <td className="px-4 py-3">
                    {row.givenName} {row.familyName}
                  </td>
                  {STATUSES.map((status) => (
                    <td key={status} className="px-4 py-3">
                      <input
                        type="radio"
                        name={`att-${row.studentId}`}
                        checked={records[row.studentId] === status}
                        onChange={() => setDraft((current) => ({ ...current, [row.studentId]: status }))}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Button
        variant="primary"
        isDisabled={query.data.records.length === 0}
        isPending={save.isPending}
        onPress={() => save.mutate()}
      >
        {t('teacher.save')}
      </Button>
    </div>
  );
}
