import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button, Label, Radio, RadioGroup, toast } from '@heroui/react';
import { Users } from 'lucide-react';
import type { AttendanceStatus, TeacherAttendance } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from './QueryState';
import { PortalEmptyState, PortalPageHeader } from '@/components/portal/PortalChrome';
import { usePageTrail } from '@/layouts/PageTrail';

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

  usePageTrail([
    { label: t('nav.classes'), to: `/teacher/classes/${classId}/${subjectId}` },
    { label: t('teacher.attendance') },
  ]);

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

  if (query.isLoading) return <QueryLoading variant="table" />;
  if (query.isError || !query.data) return <QueryError onRetry={() => void query.refetch()} />;

  return (
    <div className="space-y-4">
      <PortalPageHeader
        title={t('teacher.attendance')}
        trailing={
          <label className="grid max-w-xs gap-1 text-sm">
            <span className="text-muted">{t('teacher.date')}</span>
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
        }
      />
      {query.data.records.length === 0 ? (
        <PortalEmptyState icon={Users}>{t('teacher.emptyRoster')}</PortalEmptyState>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[28rem] text-start text-sm [&_td]:text-start [&_th]:text-start">
            <thead className="bg-surface text-muted">
              <tr>
                <th className="px-4 py-2 text-start font-medium">{t('teacher.student')}</th>
                <th className="px-4 py-2 text-start font-medium">{t('teacher.attendance')}</th>
              </tr>
            </thead>
            <tbody>
              {query.data.records.map((row) => (
                <tr key={row.studentId} className="border-t border-border">
                  <td className="px-4 py-3 [overflow-wrap:anywhere]">
                    {row.givenName} {row.familyName}
                  </td>
                  <td className="px-4 py-3">
                    <RadioGroup
                      name={`att-${row.studentId}`}
                      value={records[row.studentId] ?? 'PRESENT'}
                      onChange={(value) =>
                        setDraft((current) => ({
                          ...current,
                          [row.studentId]: value as AttendanceStatus,
                        }))
                      }
                      className="flex flex-wrap gap-3"
                    >
                      <Label className="sr-only">{t('teacher.attendance')}</Label>
                      {STATUSES.map((status) => (
                        <Radio key={status} value={status}>
                          <Radio.Content>
                            <Radio.Control>
                              <Radio.Indicator />
                            </Radio.Control>
                            {t(`teacher.mark${status.charAt(0)}${status.slice(1).toLowerCase()}`)}
                          </Radio.Content>
                        </Radio>
                      ))}
                    </RadioGroup>
                  </td>
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
