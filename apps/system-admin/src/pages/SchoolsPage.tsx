import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button, Input, Label, Modal, TextField } from '@heroui/react';
import type { Locale, PlatformSchool } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { EmptyCard, QueryError, QueryLoading } from '@/components/QueryState';

export function SchoolsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const list = useQuery({
    queryKey: ['platform-schools'],
    queryFn: () => apiFetch<PlatformSchool[]>('/platform/schools'),
  });

  if (list.isLoading) return <QueryLoading />;
  if (list.isError || !list.data) return <QueryError onRetry={() => void list.refetch()} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t('platform.schoolsTitle')}</h1>
        <Button onPress={() => setCreating((value) => !value)}>{t('platform.createSchool')}</Button>
      </div>

      {creating ? (
        <SchoolForm
          mode="create"
          onCancel={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            void queryClient.invalidateQueries({ queryKey: ['platform-schools'] });
            void queryClient.invalidateQueries({ queryKey: ['platform-overview'] });
          }}
        />
      ) : null}

      {list.data.length === 0 ? (
        <EmptyCard>{t('platform.emptySchools')}</EmptyCard>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[560px] text-start text-sm">
            <thead className="bg-overlay text-muted">
              <tr>
                <th className="px-3 py-2 font-medium">{t('platform.schoolName')}</th>
                <th className="px-3 py-2 font-medium">{t('platform.slug')}</th>
                <th className="px-3 py-2 font-medium">{t('platform.locale')}</th>
                <th className="px-3 py-2 font-medium">{t('platform.metricStudents')}</th>
                <th className="px-3 py-2 font-medium">{t('platform.metricTeachers')}</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {list.data.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{row.name}</td>
                  <td className="px-3 py-2 text-muted">{row.slug}</td>
                  <td className="px-3 py-2">{row.locale === 'ar' ? t('locale.ar') : t('locale.en')}</td>
                  <td className="px-3 py-2">{row.studentCount}</td>
                  <td className="px-3 py-2">{row.teacherCount}</td>
                  <td className="px-3 py-2 text-end">
                    <EditSchoolModal
                      school={row}
                      onSaved={() => {
                        void queryClient.invalidateQueries({ queryKey: ['platform-schools'] });
                        void queryClient.invalidateQueries({ queryKey: ['platform-overview'] });
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EditSchoolModal({ school, onSaved }: { school: PlatformSchool; onSaved: () => void }) {
  const { t } = useTranslation();
  return (
    <Modal>
      <Button size="sm" variant="secondary">
        {t('platform.editSchool')}
      </Button>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="max-w-md">
            <Modal.Header>
              <Modal.Heading>{t('platform.editSchool')}</Modal.Heading>
            </Modal.Header>
            <SchoolForm mode="edit" school={school} onSaved={onSaved} />
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function SchoolForm({
  mode,
  school,
  onCancel,
  onSaved,
}: {
  mode: 'create' | 'edit';
  school?: PlatformSchool;
  onCancel?: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(school?.name ?? '');
  const [slug, setSlug] = useState(school?.slug ?? '');
  const [locale, setLocale] = useState<Locale>(school?.locale ?? 'en');

  const save = useMutation({
    mutationFn: () =>
      mode === 'create'
        ? apiFetch<PlatformSchool>('/platform/schools', {
            method: 'POST',
            body: JSON.stringify({ name: name.trim(), slug: slug.trim(), locale }),
          })
        : apiFetch<PlatformSchool>(`/platform/schools/${school!.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ name: name.trim(), locale }),
          }),
    onSuccess: onSaved,
  });

  return (
    <form
      className={mode === 'edit' ? 'space-y-3 p-4 pt-0' : 'space-y-3 rounded-xl border border-border p-4'}
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        if (name.trim()) save.mutate();
      }}
    >
      <TextField name="schoolName" value={name} onChange={setName} isRequired>
        <Label>{t('platform.schoolName')}</Label>
        <Input />
      </TextField>
      <TextField name="slug" value={slug} onChange={setSlug} isRequired isDisabled={mode === 'edit'}>
        <Label>{t('platform.slug')}</Label>
        <Input placeholder="nile-school" />
      </TextField>
      <label className="grid gap-1 text-sm">
        <Label>{t('platform.locale')}</Label>
        <select
          className="rounded-lg border border-border bg-background px-3 py-2"
          value={locale}
          onChange={(event) => setLocale(event.target.value as Locale)}
        >
          <option value="en">{t('locale.en')}</option>
          <option value="ar">{t('locale.ar')}</option>
        </select>
      </label>
      {save.isError ? (
        <p className="text-sm text-danger">{save.error instanceof Error ? save.error.message : t('errors.generic')}</p>
      ) : null}
      <div className="flex gap-2">
        {onCancel ? (
          <Button type="button" variant="tertiary" onPress={onCancel}>
            {t('platform.cancel')}
          </Button>
        ) : (
          <Button slot="close" type="button" variant="tertiary">
            {t('platform.cancel')}
          </Button>
        )}
        <Button type="submit" isDisabled={!name.trim() || (mode === 'create' && !slug.trim()) || save.isPending}>
          {t('platform.save')}
        </Button>
      </div>
    </form>
  );
}
