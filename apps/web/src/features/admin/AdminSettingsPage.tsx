import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button, Input, Label, TextField, toast } from '@heroui/react';
import type { SchoolSettings } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthProvider';
import { QueryError, QueryLoading } from '@/features/student/QueryState';

export function AdminSettingsPage() {
  const { t } = useTranslation();
  const { refreshMe } = useAuth();
  const school = useQuery({
    queryKey: ['admin-school'],
    queryFn: () => apiFetch<SchoolSettings>('/school'),
  });
  const [name, setName] = useState('');
  const [locale, setLocale] = useState<'en' | 'ar'>('en');

  useEffect(() => {
    if (!school.data) return;
    setName(school.data.name);
    setLocale(school.data.locale);
  }, [school.data]);

  const save = useMutation({
    mutationFn: () =>
      apiFetch<SchoolSettings>('/school', {
        method: 'PATCH',
        body: JSON.stringify({ name, locale }),
      }),
    onSuccess: async () => {
      toast.success(t('admin.saved'));
      await refreshMe();
      void school.refetch();
    },
  });

  if (school.isLoading) return <QueryLoading />;
  if (school.isError || !school.data) return <QueryError onRetry={() => void school.refetch()} />;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{t('nav.settings')}</h1>
      <form
        className="space-y-4 rounded-xl border border-border p-4"
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <TextField name="schoolName" value={name} onChange={setName}>
          <Label>{t('admin.schoolName')}</Label>
          <Input />
        </TextField>
        <TextField name="slug" isDisabled value={school.data.slug}>
          <Label>{t('admin.slug')}</Label>
          <Input />
        </TextField>
        <label className="grid gap-1 text-sm">
          <Label>{t('admin.locale')}</Label>
          <select
            className="rounded-lg border border-border bg-background px-3 py-2"
            value={locale}
            onChange={(event) => setLocale(event.target.value as 'en' | 'ar')}
          >
            <option value="en">{t('locale.en')}</option>
            <option value="ar">{t('locale.ar')}</option>
          </select>
        </label>
        <Button type="submit" isDisabled={!name.trim() || save.isPending}>
          {t('admin.save')}
        </Button>
      </form>
    </div>
  );
}
