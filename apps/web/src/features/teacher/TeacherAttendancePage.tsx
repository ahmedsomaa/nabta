import { useMemo, useState } from 'react';
import type { CSSProperties, Key } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Dropdown,
  Label,
  ToggleButton,
  ToggleButtonGroup,
  toast,
} from '@heroui/react';
import { ChevronDown, Users } from 'lucide-react';
import type {
  AttendanceStatus,
  TeacherAttendance,
  TeacherAttendanceHistoryItem,
} from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from './QueryState';
import { PortalEmptyState, PortalPanel } from '@/components/portal/PortalChrome';
import { cn } from '@/lib/cn';

const STATUSES: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'];

const statusTone: Record<AttendanceStatus, 'success' | 'danger' | 'warning' | 'default'> = {
  PRESENT: 'success',
  ABSENT: 'danger',
  LATE: 'warning',
  EXCUSED: 'default',
};

const statusBar: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-success',
  ABSENT: 'bg-danger',
  LATE: 'bg-warning',
  EXCUSED: 'bg-muted',
};

const statusDot: Record<AttendanceStatus, string> = {
  PRESENT: 'bg-success',
  ABSENT: 'bg-danger',
  LATE: 'bg-warning',
  EXCUSED: 'bg-muted',
};

function toggleTone(status: AttendanceStatus): CSSProperties {
  const tone = statusTone[status];
  if (tone === 'default') return {};
  return {
    '--toggle-button-bg-selected': `var(--${tone}-soft)`,
    '--toggle-button-bg-selected-hover': `var(--${tone}-soft-hover)`,
    '--toggle-button-bg-selected-pressed': `var(--${tone}-soft-hover)`,
    '--toggle-button-fg-selected': `var(--${tone}-soft-foreground)`,
  } as CSSProperties;
}

function todayIso() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function statusLabelKey(status: AttendanceStatus) {
  return `teacher.mark${status.charAt(0)}${status.slice(1).toLowerCase()}`;
}

function markAllLabelKey(status: AttendanceStatus) {
  return `teacher.markAll${status.charAt(0)}${status.slice(1).toLowerCase()}`;
}

function initials(givenName: string, familyName: string) {
  return `${givenName.charAt(0)}${familyName.charAt(0)}`.toUpperCase();
}

export function TeacherAttendancePage() {
  const { t, i18n } = useTranslation();
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
  const history = useQuery({
    queryKey: ['teacher-attendance-history', classId, subjectId],
    queryFn: () =>
      apiFetch<TeacherAttendanceHistoryItem[]>(
        `/teacher/attendance/history?classId=${classId}&subjectId=${subjectId}`,
      ),
    enabled: Boolean(classId && subjectId),
  });
  const [draft, setDraft] = useState<Record<string, AttendanceStatus | null>>({});
  const [markAllStatus, setMarkAllStatus] = useState<AttendanceStatus>('PRESENT');

  const records = useMemo(() => {
    const base: Record<string, AttendanceStatus | null> = {};
    for (const row of query.data?.records ?? []) {
      base[row.studentId] = row.status;
    }
    return { ...base, ...draft };
  }, [query.data, draft]);

  const save = useMutation({
    mutationFn: () => {
      const payload = (query.data?.records ?? [])
        .map((row) => ({ studentId: row.studentId, status: records[row.studentId] }))
        .filter((row): row is { studentId: string; status: AttendanceStatus } => row.status != null);
      return apiFetch('/teacher/attendance', {
        method: 'PUT',
        body: JSON.stringify({ classId, subjectId, date, records: payload }),
      });
    },
    onSuccess: () => {
      toast.success(t('teacher.attendanceSaved'));
      setDraft({});
      void queryClient.invalidateQueries({ queryKey: ['teacher-attendance', classId, subjectId] });
      void queryClient.invalidateQueries({
        queryKey: ['teacher-attendance-history', classId, subjectId],
      });
      void queryClient.invalidateQueries({ queryKey: ['teacher-dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['teacher-class', classId, subjectId] });
      void queryClient.invalidateQueries({ queryKey: ['teacher-classes'] });
    },
  });

  if (query.isLoading) return <QueryLoading variant="table" />;
  if (query.isError || !query.data) return <QueryError onRetry={() => void query.refetch()} />;

  const roster = query.data.records;
  const total = roster.length;
  const counts = STATUSES.map((status) => ({
    status,
    count: roster.filter((row) => records[row.studentId] === status).length,
  }));
  const marked = counts.reduce((sum, entry) => sum + entry.count, 0);
  const unmarked = total - marked;
  const hasChanges = roster.some((row) => records[row.studentId] !== row.status);

  const setAll = (status: AttendanceStatus) => {
    const next: Record<string, AttendanceStatus | null> = {};
    for (const row of roster) next[row.studentId] = status;
    setMarkAllStatus(status);
    setDraft(next);
  };

  return (
    <div className="space-y-6">
      <PortalPanel className="space-y-4 p-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <label className="grid gap-1 text-sm">
            <span className="text-xs text-muted">{t('teacher.date')}</span>
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
          {total > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <Dropdown>
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-max max-w-none shrink-0 justify-between whitespace-nowrap"
                >
                  {t(markAllLabelKey(markAllStatus))}
                  <ChevronDown className="size-4 shrink-0" aria-hidden />
                </Button>
                <Dropdown.Popover placement="bottom end" className="w-max">
                  <Dropdown.Menu onAction={(key: Key) => setAll(key as AttendanceStatus)}>
                    {STATUSES.map((status) => (
                      <Dropdown.Item
                        key={status}
                        id={status}
                        textValue={t(markAllLabelKey(status))}
                      >
                        <span
                          className={cn('size-2 shrink-0 rounded-full', statusDot[status])}
                          aria-hidden
                        />
                        <Label className="whitespace-nowrap">{t(markAllLabelKey(status))}</Label>
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
              {hasChanges ? (
                <Button size="sm" variant="ghost" onPress={() => setDraft({})}>
                  {t('teacher.discardChanges')}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>

        {total > 0 ? (
          <div className="space-y-2">
            <div className="flex h-2 overflow-hidden rounded-full bg-default">
              {counts
                .filter((entry) => entry.count > 0)
                .map((entry) => (
                  <span
                    key={entry.status}
                    className={statusBar[entry.status]}
                    style={{ width: `${(entry.count / total) * 100}%` }}
                    aria-hidden
                  />
                ))}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              {counts.map((entry) => (
                <span key={entry.status} className="flex items-center gap-1.5">
                  <span
                    className={cn('size-2 rounded-full', statusDot[entry.status])}
                    aria-hidden
                  />
                  <span className="text-muted">{t(statusLabelKey(entry.status))}</span>
                  <span className="font-medium tabular-nums">{entry.count}</span>
                </span>
              ))}
              <span className="text-muted">
                {t('teacher.recordedOf', { recorded: marked, total })}
              </span>
            </div>
          </div>
        ) : null}
      </PortalPanel>

      {total === 0 ? (
        <PortalEmptyState icon={Users}>{t('teacher.emptyRoster')}</PortalEmptyState>
      ) : (
        <>
          <ul className="overflow-hidden rounded-xl border border-border bg-surface">
            {roster.map((row) => {
              const status = records[row.studentId] ?? null;
              return (
                <li
                  key={row.studentId}
                  className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
                >
                  <span
                    className={cn(
                      'inline-flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                      status == null ? 'bg-default text-muted' : 'bg-accent/10 text-accent',
                    )}
                    aria-hidden
                  >
                    {initials(row.givenName, row.familyName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {row.givenName} {row.familyName}
                    </p>
                    {status == null ? (
                      <p className="mt-0.5 text-xs text-muted">{t('teacher.unmarked')}</p>
                    ) : null}
                  </div>
                  <div className="w-full overflow-x-auto sm:w-auto">
                    <ToggleButtonGroup
                      size="sm"
                      selectionMode="single"
                      selectedKeys={status ? [status] : []}
                      onSelectionChange={(keys) => {
                        const next = [...keys][0] as AttendanceStatus | undefined;
                        setDraft((current) => ({ ...current, [row.studentId]: next ?? null }));
                      }}
                      aria-label={t('teacher.attendance')}
                    >
                      {STATUSES.map((entry) => (
                        <ToggleButton key={entry} id={entry} style={toggleTone(entry)}>
                          {t(statusLabelKey(entry))}
                        </ToggleButton>
                      ))}
                    </ToggleButtonGroup>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              isDisabled={marked === 0}
              isPending={save.isPending}
              onPress={() => save.mutate()}
            >
              {t('teacher.save')}
            </Button>
            {unmarked > 0 ? (
              <p className="text-sm text-muted">{t('teacher.unmarkedHint', { count: unmarked })}</p>
            ) : null}
          </div>
        </>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{t('teacher.attendanceHistory')}</h2>
        {history.isLoading ? (
          <p className="text-sm text-muted">{t('teacher.loading')}</p>
        ) : !history.data || history.data.length === 0 ? (
          <PortalEmptyState icon={Users}>{t('teacher.emptyAttendanceHistory')}</PortalEmptyState>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full min-w-[32rem] text-start text-sm [&_td]:text-start [&_th]:text-start">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-start text-xs font-medium text-muted">
                    {t('teacher.date')}
                  </th>
                  {STATUSES.map((status) => (
                    <th
                      key={status}
                      className="px-4 py-2 text-start text-xs font-medium text-muted"
                    >
                      {t(statusLabelKey(status))}
                    </th>
                  ))}
                  <th className="px-4 py-2 text-start text-xs font-medium text-muted">
                    {t('teacher.recorded')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.data.map((row) => (
                  <tr
                    key={row.date}
                    className={cn(
                      'border-t border-border',
                      row.date === date ? 'bg-overlay' : undefined,
                    )}
                  >
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        className="font-medium text-inherit hover:text-accent"
                        onClick={() => {
                          setDate(row.date);
                          setDraft({});
                        }}
                      >
                        {new Date(row.date).toLocaleDateString(i18n.language, {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">{row.present}</td>
                    <td className="px-4 py-2.5 tabular-nums">{row.absent}</td>
                    <td className="px-4 py-2.5 tabular-nums">{row.late}</td>
                    <td className="px-4 py-2.5 tabular-nums">{row.excused}</td>
                    <td className="px-4 py-2.5 tabular-nums text-muted">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
