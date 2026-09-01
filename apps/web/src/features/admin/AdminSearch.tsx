import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Input, Label, TextField } from '@heroui/react';
import type { SearchHit } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { useState } from 'react';

export function AdminSearch() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const query = useQuery({
    queryKey: ['admin-search', q],
    queryFn: () => apiFetch<SearchHit[]>(`/search?q=${encodeURIComponent(q)}`),
    enabled: q.trim().length >= 2,
  });

  return (
    <div className="relative w-44 md:w-64">
      <TextField
        className="w-full"
        name="admin-search"
        value={q}
        onChange={(value) => {
          setQ(value);
          setOpen(true);
        }}
      >
        <Label className="sr-only">{t('admin.search')}</Label>
        <Input
          placeholder={t('admin.searchPlaceholder')}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
      </TextField>
      {open && q.trim().length >= 2 ? (
        <div className="absolute end-0 z-30 mt-1 max-h-80 w-72 overflow-auto rounded-xl border border-border bg-background p-1 shadow-lg">
          {query.isLoading ? (
            <p className="px-3 py-2 text-sm text-muted">{t('student.loading')}</p>
          ) : query.data && query.data.length > 0 ? (
            query.data.map((hit) => (
              <button
                key={`${hit.type}-${hit.id}`}
                type="button"
                className="block w-full rounded-lg px-3 py-2 text-start text-sm hover:bg-overlay"
                onMouseDown={() => {
                  navigate(hit.href);
                  setOpen(false);
                  setQ('');
                }}
              >
                <span className="block font-medium">{hit.title}</span>
                <span className="block text-xs text-muted">
                  {t(`admin.type.${hit.type}`)}
                  {hit.subtitle ? ` · ${hit.subtitle}` : ''}
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-muted">{t('admin.noResults')}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
