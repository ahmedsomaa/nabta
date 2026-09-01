import type { ReactNode } from 'react';
import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button, Card, Input, Label, Modal, TextField, toast } from '@heroui/react';
import type { AcademicTerm, AcademicYear, Grade, SchoolClass, Subject } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { EmptyCard, QueryError, QueryLoading } from '@/features/student/QueryState';

export function AdminAcademicsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const years = useQuery({
    queryKey: ['admin-years'],
    queryFn: () => apiFetch<AcademicYear[]>('/academic-years?limit=100'),
  });
  const grades = useQuery({
    queryKey: ['admin-grades'],
    queryFn: () => apiFetch<Grade[]>('/grades?limit=100'),
  });
  const classes = useQuery({
    queryKey: ['admin-classes'],
    queryFn: () => apiFetch<SchoolClass[]>('/classes?limit=100'),
  });
  const subjects = useQuery({
    queryKey: ['admin-subjects'],
    queryFn: () => apiFetch<Subject[]>('/subjects?limit=100'),
  });

  if (years.isLoading || grades.isLoading || classes.isLoading || subjects.isLoading) {
    return <QueryLoading />;
  }
  if (years.isError || grades.isError || classes.isError || subjects.isError) {
    return (
      <QueryError
        onRetry={() => {
          void years.refetch();
          void grades.refetch();
          void classes.refetch();
          void subjects.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">{t('nav.academics')}</h1>

      <Section title={t('admin.years')} empty={t('admin.emptyYears')} items={years.data ?? []}>
        {(years.data ?? []).map((year) => (
          <NamedCard
            key={year.id}
            title={year.name}
            onSave={(name) => apiFetch(`/academic-years/${year.id}`, { method: 'PATCH', body: JSON.stringify({ name }) })}
            onDelete={() => apiFetch(`/academic-years/${year.id}`, { method: 'DELETE' })}
            onChanged={() => void queryClient.invalidateQueries({ queryKey: ['admin-years'] })}
          />
        ))}
        <CreateYear onCreated={() => void queryClient.invalidateQueries({ queryKey: ['admin-years'] })} />
      </Section>

      <TermsSection years={years.data ?? []} />

      <Section title={t('admin.grades')} empty={t('admin.emptyGrades')} items={grades.data ?? []}>
        {(grades.data ?? []).map((grade) => (
          <NamedCard
            key={grade.id}
            title={grade.name}
            description={`${t('admin.level')} ${grade.level}`}
            extraFields={
              <input
                name="level"
                defaultValue={String(grade.level)}
                aria-label={t('admin.level')}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            }
            onSave={(name, form) =>
              apiFetch(`/grades/${grade.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                  name,
                  level: Number(new FormData(form).get('level') || grade.level),
                }),
              })
            }
            onDelete={() => apiFetch(`/grades/${grade.id}`, { method: 'DELETE' })}
            onChanged={() => void queryClient.invalidateQueries({ queryKey: ['admin-grades'] })}
          />
        ))}
        <CreateGrade
          years={years.data ?? []}
          onCreated={() => void queryClient.invalidateQueries({ queryKey: ['admin-grades'] })}
        />
      </Section>

      <Section title={t('admin.classes')} empty={t('admin.emptyClasses')} items={classes.data ?? []}>
        {(classes.data ?? []).map((row) => (
          <NamedCard
            key={row.id}
            title={row.name}
            description={row.gradeName}
            onOpen={() => navigate(`/admin/academics/classes/${row.id}`)}
            onSave={(name) => apiFetch(`/classes/${row.id}`, { method: 'PATCH', body: JSON.stringify({ name }) })}
            onDelete={() => apiFetch(`/classes/${row.id}`, { method: 'DELETE' })}
            onChanged={() => void queryClient.invalidateQueries({ queryKey: ['admin-classes'] })}
          />
        ))}
        <CreateClass
          grades={grades.data ?? []}
          onCreated={() => void queryClient.invalidateQueries({ queryKey: ['admin-classes'] })}
        />
      </Section>

      <Section title={t('admin.subjects')} empty={t('admin.emptySubjects')} items={subjects.data ?? []}>
        {(subjects.data ?? []).map((subject) => (
          <NamedCard
            key={subject.id}
            title={subject.name}
            description={subject.code ?? '—'}
            extraFields={
              <input name="code" defaultValue={subject.code ?? ''} aria-label={t('admin.code')} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            }
            onSave={(name, form) =>
              apiFetch(`/subjects/${subject.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                  name,
                  code: String(new FormData(form).get('code') || '') || null,
                }),
              })
            }
            onDelete={() => apiFetch(`/subjects/${subject.id}`, { method: 'DELETE' })}
            onChanged={() => void queryClient.invalidateQueries({ queryKey: ['admin-subjects'] })}
          />
        ))}
        <CreateSubject
          grades={grades.data ?? []}
          onCreated={() => void queryClient.invalidateQueries({ queryKey: ['admin-subjects'] })}
        />
      </Section>
    </div>
  );
}

function dateInputValue(value: string | null | undefined) {
  return value ? value.slice(0, 10) : '';
}

function dateRangeLabel(startsOn: string | null, endsOn: string | null) {
  const start = dateInputValue(startsOn) || '—';
  const end = dateInputValue(endsOn) || '—';
  return `${start} – ${end}`;
}

function optionalDatePayload(value: FormDataEntryValue | null) {
  const trimmed = String(value ?? '').trim();
  return trimmed || null;
}

function TermsSection({ years }: { years: AcademicYear[] }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const termQueries = useQueries({
    queries: years.map((year) => ({
      queryKey: ['admin-terms', year.id],
      queryFn: () => apiFetch<AcademicTerm[]>(`/academic-years/${year.id}/terms`),
    })),
  });

  if (years.length > 0 && termQueries.some((query) => query.isLoading)) {
    return <QueryLoading />;
  }
  if (termQueries.some((query) => query.isError)) {
    return (
      <QueryError
        onRetry={() => {
          for (const query of termQueries) void query.refetch();
        }}
      />
    );
  }

  const terms = termQueries.flatMap((query) => query.data ?? []);
  const yearName = (academicYearId: string) => years.find((year) => year.id === academicYearId)?.name ?? '';

  return (
    <Section title={t('admin.terms')} empty={t('admin.emptyTerms')} items={terms}>
      {terms.map((term) => (
        <NamedCard
          key={term.id}
          title={term.name}
          description={`${yearName(term.academicYearId)} · ${dateRangeLabel(term.startsOn, term.endsOn)}`}
          extraFields={
            <>
              <input
                type="date"
                name="startsOn"
                defaultValue={dateInputValue(term.startsOn)}
                aria-label={t('admin.startsOn')}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <input
                type="date"
                name="endsOn"
                defaultValue={dateInputValue(term.endsOn)}
                aria-label={t('admin.endsOn')}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </>
          }
          onSave={(name, form) => {
            const data = new FormData(form);
            return apiFetch(`/terms/${term.id}`, {
              method: 'PATCH',
              body: JSON.stringify({
                name,
                startsOn: optionalDatePayload(data.get('startsOn')),
                endsOn: optionalDatePayload(data.get('endsOn')),
              }),
            });
          }}
          onDelete={() => apiFetch(`/terms/${term.id}`, { method: 'DELETE' })}
          onChanged={() => void queryClient.invalidateQueries({ queryKey: ['admin-terms'] })}
        />
      ))}
      <CreateTerm
        years={years}
        onCreated={() => void queryClient.invalidateQueries({ queryKey: ['admin-terms'] })}
      />
    </Section>
  );
}

function CreateTerm({ years, onCreated }: { years: AcademicYear[]; onCreated: () => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [academicYearId, setAcademicYearId] = useState(years[0]?.id ?? '');
  const [startsOn, setStartsOn] = useState('');
  const [endsOn, setEndsOn] = useState('');
  const create = useMutation({
    mutationFn: () =>
      apiFetch(`/academic-years/${academicYearId}/terms`, {
        method: 'POST',
        body: JSON.stringify({
          name,
          ...(startsOn ? { startsOn } : {}),
          ...(endsOn ? { endsOn } : {}),
        }),
      }),
    onSuccess: () => {
      setName('');
      setStartsOn('');
      setEndsOn('');
      onCreated();
    },
  });
  return (
    <form
      className="space-y-2 rounded-xl border border-dashed border-border p-4"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        if (name.trim() && academicYearId) create.mutate();
      }}
    >
      <Label>{t('admin.createTerm')}</Label>
      <select
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        value={academicYearId}
        onChange={(event) => setAcademicYearId(event.target.value)}
        aria-label={t('admin.yearName')}
      >
        {years.map((year) => (
          <option key={year.id} value={year.id}>
            {year.name}
          </option>
        ))}
      </select>
      <TextField name="termName" value={name} onChange={setName}>
        <Label className="sr-only">{t('admin.termName')}</Label>
        <Input placeholder={t('admin.termName')} />
      </TextField>
      <label className="grid gap-1 text-sm">
        <span className="sr-only">{t('admin.startsOn')}</span>
        <input
          type="date"
          aria-label={t('admin.startsOn')}
          value={startsOn}
          onChange={(event) => setStartsOn(event.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </label>
      <label className="grid gap-1 text-sm">
        <span className="sr-only">{t('admin.endsOn')}</span>
        <input
          type="date"
          aria-label={t('admin.endsOn')}
          value={endsOn}
          onChange={(event) => setEndsOn(event.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </label>
      {create.isError ? <p className="text-sm text-danger">{create.error.message}</p> : null}
      <Button type="submit" size="sm" isDisabled={!name.trim() || !academicYearId || create.isPending}>
        {t('admin.createTerm')}
      </Button>
    </form>
  );
}

function Section({
  title,
  empty,
  items,
  children,
}: {
  title: string;
  empty: string;
  items: unknown[];
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      {items.length === 0 ? <EmptyCard>{empty}</EmptyCard> : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

function NamedCard({
  title,
  description,
  extraFields,
  onOpen,
  onSave,
  onDelete,
  onChanged,
}: {
  title: string;
  description?: string;
  extraFields?: ReactNode;
  onOpen?: () => void;
  onSave: (name: string, form: HTMLFormElement) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(title);
  const save = useMutation({
    mutationFn: (form: HTMLFormElement) => onSave(name, form),
    onSuccess: () => {
      setEditing(false);
      toast.success(t('admin.saved'));
      onChanged();
    },
  });
  const remove = useMutation({
    mutationFn: onDelete,
    onSuccess: () => {
      toast.success(t('admin.saved'));
      onChanged();
    },
  });

  return (
    <Card className="h-full p-4">
      {editing ? (
        <form
          className="space-y-2"
          onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            event.stopPropagation();
            if (name.trim()) save.mutate(event.currentTarget);
          }}
        >
          <TextField name="entity-name" value={name} onChange={setName}>
            <Label className="sr-only">{title}</Label>
            <Input />
          </TextField>
          {extraFields}
          <div className="flex gap-2">
            <Button type="submit" size="sm" isDisabled={!name.trim() || save.isPending}>
              {t('admin.save')}
            </Button>
            <Button type="button" size="sm" variant="tertiary" onPress={() => setEditing(false)}>
              {t('admin.cancel')}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex h-full flex-col gap-3">
          {onOpen ? (
            <button type="button" className="flex-1 rounded-lg text-start" onClick={onOpen}>
              <Card.Header>
                <Card.Title>{title}</Card.Title>
                {description ? <Card.Description>{description}</Card.Description> : null}
              </Card.Header>
            </button>
          ) : (
            <Card.Header>
              <Card.Title>{title}</Card.Title>
              {description ? <Card.Description>{description}</Card.Description> : null}
            </Card.Header>
          )}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onPress={() => {
                setName(title);
                setEditing(true);
              }}
            >
              {t('admin.edit')}
            </Button>
            <Modal>
              <Button size="sm" variant="danger">
                {t('admin.delete')}
              </Button>
              <Modal.Backdrop>
                <Modal.Container>
                  <Modal.Dialog>
                    <Modal.Header>
                      <Modal.Heading>{t('admin.deleteConfirm')}</Modal.Heading>
                    </Modal.Header>
                    <Modal.Footer>
                      <Button slot="close" variant="tertiary">
                        {t('admin.cancel')}
                      </Button>
                      <Button variant="danger" onPress={() => remove.mutate()} isDisabled={remove.isPending}>
                        {t('admin.delete')}
                      </Button>
                    </Modal.Footer>
                  </Modal.Dialog>
                </Modal.Container>
              </Modal.Backdrop>
            </Modal>
          </div>
        </div>
      )}
    </Card>
  );
}

function CreateYear({ onCreated }: { onCreated: () => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const create = useMutation({
    mutationFn: () => apiFetch('/academic-years', { method: 'POST', body: JSON.stringify({ name }) }),
    onSuccess: () => {
      setName('');
      onCreated();
    },
  });
  return (
    <form
      className="rounded-xl border border-dashed border-border p-4"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        if (name.trim()) create.mutate();
      }}
    >
      <TextField name="yearName" value={name} onChange={setName}>
        <Label>{t('admin.createYear')}</Label>
        <Input placeholder="2027/2028" />
      </TextField>
      {create.isError ? <p className="mt-2 text-sm text-danger">{create.error.message}</p> : null}
      <Button className="mt-3" type="submit" size="sm" isDisabled={!name.trim() || create.isPending}>
        {t('admin.createYear')}
      </Button>
    </form>
  );
}

function CreateGrade({ years, onCreated }: { years: AcademicYear[]; onCreated: () => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [level, setLevel] = useState('10');
  const [academicYearId, setAcademicYearId] = useState(years[0]?.id ?? '');
  const create = useMutation({
    mutationFn: () =>
      apiFetch('/grades', {
        method: 'POST',
        body: JSON.stringify({ name, level: Number(level), academicYearId }),
      }),
    onSuccess: () => {
      setName('');
      onCreated();
    },
  });
  return (
    <form
      className="space-y-2 rounded-xl border border-dashed border-border p-4"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        if (name.trim() && academicYearId) create.mutate();
      }}
    >
      <Label>{t('admin.createGrade')}</Label>
      <select
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        value={academicYearId}
        onChange={(event) => setAcademicYearId(event.target.value)}
      >
        {years.map((year) => (
          <option key={year.id} value={year.id}>
            {year.name}
          </option>
        ))}
      </select>
      <TextField name="gradeName" value={name} onChange={setName}>
        <Label className="sr-only">{t('admin.gradeName')}</Label>
        <Input placeholder={t('admin.gradeName')} />
      </TextField>
      <TextField name="level" value={level} onChange={setLevel}>
        <Label className="sr-only">{t('admin.level')}</Label>
        <Input placeholder={t('admin.level')} />
      </TextField>
      {create.isError ? <p className="text-sm text-danger">{create.error.message}</p> : null}
      <Button type="submit" size="sm" isDisabled={!name.trim() || !academicYearId || create.isPending}>
        {t('admin.createGrade')}
      </Button>
    </form>
  );
}

function CreateClass({ grades, onCreated }: { grades: Grade[]; onCreated: () => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [gradeId, setGradeId] = useState(grades[0]?.id ?? '');
  const create = useMutation({
    mutationFn: () => apiFetch('/classes', { method: 'POST', body: JSON.stringify({ name, gradeId }) }),
    onSuccess: () => {
      setName('');
      onCreated();
    },
  });
  return (
    <form
      className="space-y-2 rounded-xl border border-dashed border-border p-4"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        if (name.trim() && gradeId) create.mutate();
      }}
    >
      <Label>{t('admin.createClass')}</Label>
      <select
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        value={gradeId}
        onChange={(event) => setGradeId(event.target.value)}
      >
        {grades.map((grade) => (
          <option key={grade.id} value={grade.id}>
            {grade.name}
          </option>
        ))}
      </select>
      <TextField name="className" value={name} onChange={setName}>
        <Label className="sr-only">{t('admin.className')}</Label>
        <Input placeholder={t('admin.className')} />
      </TextField>
      {create.isError ? <p className="text-sm text-danger">{create.error.message}</p> : null}
      <Button type="submit" size="sm" isDisabled={!name.trim() || !gradeId || create.isPending}>
        {t('admin.createClass')}
      </Button>
    </form>
  );
}

function CreateSubject({ grades, onCreated }: { grades: Grade[]; onCreated: () => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [gradeId, setGradeId] = useState(grades[0]?.id ?? '');
  const create = useMutation({
    mutationFn: () =>
      apiFetch('/subjects', {
        method: 'POST',
        body: JSON.stringify({ name, code: code || null, gradeId: gradeId || null }),
      }),
    onSuccess: () => {
      setName('');
      setCode('');
      onCreated();
    },
  });
  return (
    <form
      className="space-y-2 rounded-xl border border-dashed border-border p-4"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        if (name.trim()) create.mutate();
      }}
    >
      <Label>{t('admin.createSubject')}</Label>
      <select
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        value={gradeId}
        onChange={(event) => setGradeId(event.target.value)}
      >
        <option value="">{t('admin.none')}</option>
        {grades.map((grade) => (
          <option key={grade.id} value={grade.id}>
            {grade.name}
          </option>
        ))}
      </select>
      <TextField name="subjectName" value={name} onChange={setName}>
        <Label className="sr-only">{t('admin.subjectName')}</Label>
        <Input placeholder={t('admin.subjectName')} />
      </TextField>
      <TextField name="code" value={code} onChange={setCode}>
        <Label className="sr-only">{t('admin.code')}</Label>
        <Input placeholder={t('admin.code')} />
      </TextField>
      {create.isError ? <p className="text-sm text-danger">{create.error.message}</p> : null}
      <Button type="submit" size="sm" isDisabled={!name.trim() || create.isPending}>
        {t('admin.createSubject')}
      </Button>
    </form>
  );
}
