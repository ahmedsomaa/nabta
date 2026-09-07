import { useMemo, useState } from 'react';
import type { Key } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button, Dropdown, Label, Modal, toast } from '@heroui/react';
import type { LucideIcon } from 'lucide-react';
import {
  FileText,
  Film,
  Image as ImageIcon,
  Link2,
  MoreHorizontal,
  Paperclip,
  Presentation,
} from 'lucide-react';
import type { FilePresignResult, TeacherClassDetail, TeacherMaterialItem, TeacherRosterRow } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from './QueryState';
import { PortalEmptyState, PortalPageHeader } from '@/components/portal/PortalChrome';
import { PortalFilterChips } from '@/components/portal/PortalTabs';

type ClassOutlet = { detail: TeacherClassDetail; roster: TeacherRosterRow[] };

type MaterialCategory = 'all' | 'document' | 'video' | 'link' | 'presentation';
type MaterialSort = 'added' | 'name' | 'updated';
type Dialog =
  | { type: 'upload' }
  | { type: 'edit'; item: TeacherMaterialItem }
  | { type: 'move'; item: TeacherMaterialItem }
  | { type: 'delete'; item: TeacherMaterialItem };

const PPT_MIME = new Set([
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

function materialCategory(item: TeacherMaterialItem): Exclude<MaterialCategory, 'all'> {
  if (item.url) return 'link';
  if (item.mimeType.startsWith('video/')) return 'video';
  if (PPT_MIME.has(item.mimeType)) return 'presentation';
  return 'document';
}

function materialIcon(item: TeacherMaterialItem): LucideIcon {
  const category = materialCategory(item);
  if (category === 'link') return Link2;
  if (category === 'video') return Film;
  if (category === 'presentation') return Presentation;
  if (item.mimeType.startsWith('image/')) return ImageIcon;
  return FileText;
}

function openHref(item: TeacherMaterialItem) {
  return item.url ?? item.downloadUrl;
}

function maxBytesForMime(mimeType: string) {
  return mimeType.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
}

function typeLabelKey(category: Exclude<MaterialCategory, 'all'>) {
  return `teacher.materialType.${category}`;
}

export function TeacherClassMaterialsPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { classId = '', subjectId = '' } = useParams();
  const { detail } = useOutletContext<ClassOutlet>();
  const lessons = detail.units.flatMap((unit) =>
    unit.lessons.map((lesson) => ({ ...lesson, unitTitle: unit.title, unitId: unit.id })),
  );
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<MaterialCategory>('all');
  const [topicId, setTopicId] = useState<'all' | string>('all');
  const [sort, setSort] = useState<MaterialSort>('added');
  const [dialog, setDialog] = useState<Dialog | null>(null);

  const query = useQuery({
    queryKey: ['teacher-materials', classId, subjectId],
    queryFn: () =>
      apiFetch<TeacherMaterialItem[]>(
        `/teacher/classes/${classId}/subjects/${subjectId}/materials`,
      ),
    enabled: Boolean(classId && subjectId),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['teacher-materials', classId, subjectId] });
    void queryClient.invalidateQueries({ queryKey: ['teacher-class', classId, subjectId] });
  };

  const items = query.data ?? [];
  const needle = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    const next = items.filter((item) => {
      if (category !== 'all' && materialCategory(item) !== category) return false;
      if (topicId !== 'all' && item.unitId !== topicId) return false;
      if (!needle) return true;
      return [item.fileName, item.unitTitle, item.lessonTitle].some((value) =>
        value.toLowerCase().includes(needle),
      );
    });
    next.sort((a, b) => {
      if (sort === 'name') return a.fileName.localeCompare(b.fileName, i18n.language);
      if (sort === 'updated') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return next;
  }, [items, category, topicId, needle, sort, i18n.language]);

  const recent =
    items.length >= 8
      ? [...items]
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 3)
      : [];

  const dateLabel = (value: string) =>
    new Date(value).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' });

  if (query.isLoading) return <QueryLoading />;
  if (query.isError || !query.data) return <QueryError onRetry={() => void query.refetch()} />;

  const builderHref = `/teacher/classes/${classId}/${subjectId}/builder`;

  return (
    <div className="space-y-5">
      <PortalPageHeader
        title={t('teacher.tabMaterials')}
        subtitle={t('teacher.materialsSubtitle')}
        trailing={
          lessons.length > 0 ? (
            <Button variant="primary" onPress={() => setDialog({ type: 'upload' })}>
              {t('teacher.uploadMaterial')}
            </Button>
          ) : null
        }
      />

      {lessons.length === 0 ? (
        <PortalEmptyState
          icon={Paperclip}
          action={{ label: t('teacher.editStructure'), onPress: () => navigate(builderHref) }}
        >
          {t('teacher.materialsNeedLessons')}
        </PortalEmptyState>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <label className="block">
              <span className="sr-only">{t('teacher.searchMaterials')}</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('teacher.searchMaterials')}
                className="w-full max-w-xs rounded-lg border border-border bg-surface px-3 py-2 text-sm"
              />
            </label>
            <PortalFilterChips
              value={category}
              onChange={setCategory}
              options={[
                { id: 'all', label: t('teacher.filterAll'), count: items.length },
                {
                  id: 'document',
                  label: t('teacher.materialType.document'),
                  count: items.filter((item) => materialCategory(item) === 'document').length,
                },
                {
                  id: 'video',
                  label: t('teacher.materialType.video'),
                  count: items.filter((item) => materialCategory(item) === 'video').length,
                },
                {
                  id: 'link',
                  label: t('teacher.materialType.link'),
                  count: items.filter((item) => materialCategory(item) === 'link').length,
                },
                {
                  id: 'presentation',
                  label: t('teacher.materialType.presentation'),
                  count: items.filter((item) => materialCategory(item) === 'presentation').length,
                },
              ]}
            />
            <label className="ms-auto grid gap-1 text-sm">
              <span className="sr-only">{t('teacher.sortBy')}</span>
              <select
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                value={sort}
                onChange={(event) => setSort(event.target.value as MaterialSort)}
              >
                <option value="added">{t('teacher.sortAdded')}</option>
                <option value="name">{t('teacher.sortName')}</option>
                <option value="updated">{t('teacher.sortUpdated')}</option>
              </select>
            </label>
          </div>

          <PortalFilterChips
            value={topicId}
            onChange={setTopicId}
            options={[
              { id: 'all', label: t('teacher.topicAll'), count: items.length },
              ...detail.units.map((unit) => ({
                id: unit.id,
                label: unit.title,
                count: items.filter((item) => item.unitId === unit.id).length,
              })),
            ]}
          />

          {recent.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-sm font-medium text-muted">{t('teacher.recentlyAdded')}</h2>
              <ul className="flex flex-wrap gap-2">
                {recent.map((item) => (
                  <li key={item.id}>
                    <a
                      href={openHref(item) ?? undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-inherit no-underline hover:border-accent/40"
                    >
                      <span className="truncate max-w-[12rem]">{item.fileName}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {filtered.length === 0 ? (
            <PortalEmptyState icon={Paperclip}>
              {items.length === 0 ? t('teacher.emptyMaterials') : t('teacher.emptyFilter')}
            </PortalEmptyState>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border bg-surface">
              <table className="w-full min-w-[42rem] text-start text-sm [&_td]:text-start [&_th]:text-start">
                <thead>
                  <tr className="border-b border-border">
                    <th className="w-10 px-4 py-2" />
                    <th className="px-4 py-2 text-start text-xs font-medium text-muted">
                      {t('teacher.material')}
                    </th>
                    <th className="px-4 py-2 text-start text-xs font-medium text-muted">
                      {t('teacher.lessonType')}
                    </th>
                    <th className="px-4 py-2 text-start text-xs font-medium text-muted">
                      {t('teacher.topic')}
                    </th>
                    <th className="px-4 py-2 text-start text-xs font-medium text-muted">
                      {t('teacher.added')}
                    </th>
                    <th className="w-12 px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => {
                    const Icon = materialIcon(item);
                    const href = openHref(item);
                    return (
                      <tr key={item.id} className="border-t border-border hover:bg-overlay">
                        <td className="px-4 py-3">
                          <span className="inline-flex size-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
                            <Icon className="size-4" aria-hidden />
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium [overflow-wrap:anywhere]">
                          {href ? (
                            <a
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                              className="text-inherit no-underline hover:text-accent"
                            >
                              {item.fileName}
                            </a>
                          ) : (
                            item.fileName
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {t(typeLabelKey(materialCategory(item)))}
                        </td>
                        <td className="px-4 py-3 text-muted">{item.unitTitle}</td>
                        <td className="px-4 py-3 tabular-nums text-muted">{dateLabel(item.createdAt)}</td>
                        <td className="px-2 py-3 text-end">
                          <Dropdown>
                            <Button size="sm" variant="ghost" isIconOnly aria-label={t('teacher.actions')}>
                              <MoreHorizontal className="size-4" />
                            </Button>
                            <Dropdown.Popover placement="bottom end" className="w-max">
                              <Dropdown.Menu
                                onAction={(key: Key) => {
                                  if (key === 'open' && href) window.open(href, '_blank', 'noopener');
                                  if (key === 'edit') setDialog({ type: 'edit', item });
                                  if (key === 'move') setDialog({ type: 'move', item });
                                  if (key === 'delete') setDialog({ type: 'delete', item });
                                }}
                              >
                                <Dropdown.Item id="open" textValue={t('teacher.open')} isDisabled={!href}>
                                  <Label>{t('teacher.open')}</Label>
                                </Dropdown.Item>
                                <Dropdown.Item id="edit" textValue={t('teacher.editMaterial')}>
                                  <Label>{t('teacher.editMaterial')}</Label>
                                </Dropdown.Item>
                                <Dropdown.Item id="move" textValue={t('teacher.moveMaterial')}>
                                  <Label>{t('teacher.moveMaterial')}</Label>
                                </Dropdown.Item>
                                <Dropdown.Item id="delete" textValue={t('teacher.delete')}>
                                  <Label>{t('teacher.delete')}</Label>
                                </Dropdown.Item>
                              </Dropdown.Menu>
                            </Dropdown.Popover>
                          </Dropdown>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {dialog?.type === 'upload' ? (
        <UploadDialog
          lessons={lessons}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            invalidate();
          }}
        />
      ) : null}
      {dialog?.type === 'edit' ? (
        <EditDialog
          item={dialog.item}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            invalidate();
          }}
        />
      ) : null}
      {dialog?.type === 'move' ? (
        <MoveDialog
          item={dialog.item}
          lessons={lessons}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            invalidate();
          }}
        />
      ) : null}
      {dialog?.type === 'delete' ? (
        <DeleteDialog
          item={dialog.item}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            invalidate();
          }}
        />
      ) : null}
    </div>
  );
}

function UploadDialog({
  lessons,
  onClose,
  onSaved,
}: {
  lessons: { id: string; title: string; unitTitle: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [kind, setKind] = useState<'file' | 'link'>('file');
  const [lessonId, setLessonId] = useState(lessons[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      if (kind === 'link') {
        return apiFetch(`/teacher/lessons/${lessonId}/materials`, {
          method: 'POST',
          body: JSON.stringify({ fileName: title.trim(), url: url.trim() }),
        });
      }
      if (!file) throw new Error('missing-file');
      if (file.size > maxBytesForMime(file.type || 'application/octet-stream')) {
        throw new Error('too-large');
      }
      const presign = await apiFetch<FilePresignResult>('/teacher/files/presign', {
        method: 'POST',
        body: JSON.stringify({
          purpose: 'material',
          lessonId,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          fileName: file.name,
        }),
      });
      const put = await fetch(presign.uploadUrl, { method: 'PUT', body: file });
      if (!put.ok) throw new Error('Upload failed');
      return apiFetch(`/teacher/lessons/${lessonId}/materials`, {
        method: 'POST',
        body: JSON.stringify({
          storageKey: presign.storageKey,
          mimeType: file.type || 'application/octet-stream',
          size: file.size,
          fileName: file.name,
        }),
      });
    },
    onSuccess: onSaved,
    onError: () => toast.danger(t('teacher.uploadFailed')),
  });

  return (
    <Modal.Backdrop isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Container>
        <Modal.Dialog className="max-w-md">
          <Modal.Header>
            <Modal.Heading>{t('teacher.uploadMaterial')}</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="space-y-3">
            <PortalFilterChips
              value={kind}
              onChange={setKind}
              options={[
                { id: 'file', label: t('teacher.uploadFile') },
                { id: 'link', label: t('teacher.uploadLink') },
              ]}
            />
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-muted">{t('teacher.chooseLesson')}</span>
              <select
                className="rounded-lg border border-border bg-surface px-3 py-2"
                value={lessonId}
                onChange={(event) => setLessonId(event.target.value)}
              >
                {lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.unitTitle} · {lesson.title}
                  </option>
                ))}
              </select>
            </label>
            {kind === 'file' ? (
              <label className="grid gap-1 text-sm">
                <span className="text-xs text-muted">{t('teacher.file')}</span>
                <input
                  type="file"
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </label>
            ) : (
              <>
                <label className="grid gap-1 text-sm">
                  <span className="text-xs text-muted">{t('teacher.title')}</span>
                  <input
                    className="rounded-lg border border-border bg-surface px-3 py-2"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </label>
                <label className="grid gap-1 text-sm">
                  <span className="text-xs text-muted">{t('teacher.linkUrl')}</span>
                  <input
                    className="rounded-lg border border-border bg-surface px-3 py-2"
                    value={url}
                    placeholder="https://"
                    onChange={(event) => setUrl(event.target.value)}
                  />
                </label>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button slot="close" variant="tertiary">
              {t('teacher.cancel')}
            </Button>
            <Button
              variant="primary"
              isPending={save.isPending}
              isDisabled={kind === 'file' ? !file || !lessonId : !title.trim() || !url.trim() || !lessonId}
              onPress={() => save.mutate()}
            >
              {t('teacher.save')}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

function EditDialog({
  item,
  onClose,
  onSaved,
}: {
  item: TeacherMaterialItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState(item.fileName);
  const [url, setUrl] = useState(item.url ?? '');
  const save = useMutation({
    mutationFn: () =>
      apiFetch(`/teacher/materials/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          fileName: title.trim(),
          ...(item.url ? { url: url.trim() } : {}),
        }),
      }),
    onSuccess: onSaved,
    onError: () => toast.danger(t('teacher.saveFailed')),
  });

  return (
    <Modal.Backdrop isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Container>
        <Modal.Dialog className="max-w-md">
          <Modal.Header>
            <Modal.Heading>{t('teacher.editMaterial')}</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="space-y-3">
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-muted">{t('teacher.title')}</span>
              <input
                className="rounded-lg border border-border bg-surface px-3 py-2"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            {item.url ? (
              <label className="grid gap-1 text-sm">
                <span className="text-xs text-muted">{t('teacher.linkUrl')}</span>
                <input
                  className="rounded-lg border border-border bg-surface px-3 py-2"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                />
              </label>
            ) : null}
          </Modal.Body>
          <Modal.Footer>
            <Button slot="close" variant="tertiary">
              {t('teacher.cancel')}
            </Button>
            <Button
              variant="primary"
              isPending={save.isPending}
              isDisabled={!title.trim() || (Boolean(item.url) && !url.trim())}
              onPress={() => save.mutate()}
            >
              {t('teacher.save')}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

function MoveDialog({
  item,
  lessons,
  onClose,
  onSaved,
}: {
  item: TeacherMaterialItem;
  lessons: { id: string; title: string; unitTitle: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [lessonId, setLessonId] = useState(item.lessonId);
  const save = useMutation({
    mutationFn: () =>
      apiFetch(`/teacher/materials/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ lessonId }),
      }),
    onSuccess: onSaved,
    onError: () => toast.danger(t('teacher.saveFailed')),
  });

  return (
    <Modal.Backdrop isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Container>
        <Modal.Dialog className="max-w-md">
          <Modal.Header>
            <Modal.Heading>{t('teacher.moveMaterial')}</Modal.Heading>
          </Modal.Header>
          <Modal.Body className="space-y-3">
            <label className="grid gap-1 text-sm">
              <span className="text-xs text-muted">{t('teacher.chooseLesson')}</span>
              <select
                className="rounded-lg border border-border bg-surface px-3 py-2"
                value={lessonId}
                onChange={(event) => setLessonId(event.target.value)}
              >
                {lessons.map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.unitTitle} · {lesson.title}
                  </option>
                ))}
              </select>
            </label>
          </Modal.Body>
          <Modal.Footer>
            <Button slot="close" variant="tertiary">
              {t('teacher.cancel')}
            </Button>
            <Button
              variant="primary"
              isPending={save.isPending}
              isDisabled={lessonId === item.lessonId}
              onPress={() => save.mutate()}
            >
              {t('teacher.save')}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}

function DeleteDialog({
  item,
  onClose,
  onSaved,
}: {
  item: TeacherMaterialItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const remove = useMutation({
    mutationFn: () => apiFetch(`/teacher/materials/${item.id}`, { method: 'DELETE' }),
    onSuccess: onSaved,
    onError: () => toast.danger(t('teacher.saveFailed')),
  });

  return (
    <Modal.Backdrop isOpen onOpenChange={(open) => !open && onClose()}>
      <Modal.Container>
        <Modal.Dialog className="max-w-md">
          <Modal.Header>
            <Modal.Heading>{t('teacher.deleteConfirm')}</Modal.Heading>
          </Modal.Header>
          <Modal.Body>
            <p className="text-sm [overflow-wrap:anywhere]">{item.fileName}</p>
          </Modal.Body>
          <Modal.Footer>
            <Button slot="close" variant="tertiary">
              {t('teacher.cancel')}
            </Button>
            <Button variant="danger" isPending={remove.isPending} onPress={() => remove.mutate()}>
              {t('teacher.delete')}
            </Button>
          </Modal.Footer>
        </Modal.Dialog>
      </Modal.Container>
    </Modal.Backdrop>
  );
}
