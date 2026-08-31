import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, Chip, Input, Label, Modal, TextArea, TextField, toast } from '@heroui/react';
import { GripVertical } from 'lucide-react';
import type { FilePresignResult, LessonType, TeacherClassDetail, TeacherLessonDetail } from '@nabta/types';
import { apiFetch } from '@/lib/api';
import { QueryError, QueryLoading } from './QueryState';

const TYPES: LessonType[] = ['RICH_TEXT', 'VIDEO', 'PDF', 'IMAGE', 'EXTERNAL'];
const MAX_BYTES = 10 * 1024 * 1024;

function UnitTitleField({
  id,
  title,
  onSave,
}: {
  id: string;
  title: string;
  onSave: (id: string, title: string) => void;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState(title);

  useEffect(() => {
    setValue(title);
  }, [title]);

  return (
    <TextField name={`unit-title-${id}`} value={value} onChange={setValue} className="min-w-0 flex-1">
      <Label className="sr-only">{t('teacher.unitTitle')}</Label>
      <Input
        className="font-semibold"
        onBlur={() => {
          const next = value.trim();
          if (next && next !== title) onSave(id, next);
        }}
      />
    </TextField>
  );
}

function SortableRow({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-start gap-2"
    >
      <button
        type="button"
        className="mt-3 shrink-0 text-muted"
        aria-label="reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function TeacherBuilderPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { classId = '', subjectId = '' } = useParams();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [unitTitle, setUnitTitle] = useState('');

  const detail = useQuery({
    queryKey: ['teacher-class', classId, subjectId],
    queryFn: () => apiFetch<TeacherClassDetail>(`/teacher/classes/${classId}/subjects/${subjectId}`),
    enabled: Boolean(classId && subjectId),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ['teacher-class', classId, subjectId] });

  const addUnit = useMutation({
    mutationFn: () =>
      apiFetch('/teacher/units', {
        method: 'POST',
        body: JSON.stringify({ classId, subjectId, title: unitTitle || 'Unit' }),
      }),
    onSuccess: () => {
      setUnitTitle('');
      void invalidate();
    },
  });

  const reorderUnits = useMutation({
    mutationFn: (ids: string[]) =>
      apiFetch('/teacher/units/reorder', {
        method: 'POST',
        body: JSON.stringify({ classId, subjectId, ids }),
      }),
    onSuccess: () => void invalidate(),
  });

  const addLesson = useMutation({
    mutationFn: (unitId: string) =>
      apiFetch('/teacher/lessons', {
        method: 'POST',
        body: JSON.stringify({ unitId, title: 'New lesson', type: 'RICH_TEXT' }),
      }),
    onSuccess: () => void invalidate(),
  });

  const reorderLessons = useMutation({
    mutationFn: ({ unitId, ids }: { unitId: string; ids: string[] }) =>
      apiFetch('/teacher/lessons/reorder', { method: 'POST', body: JSON.stringify({ unitId, ids }) }),
    onSuccess: () => void invalidate(),
  });

  const renameUnit = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      apiFetch(`/teacher/units/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title }),
      }),
    onSuccess: () => void invalidate(),
  });

  const deleteUnit = useMutation({
    mutationFn: (id: string) => apiFetch(`/teacher/units/${id}`, { method: 'DELETE' }),
    onSuccess: () => void invalidate(),
  });

  if (detail.isLoading) return <QueryLoading />;
  if (detail.isError || !detail.data) return <QueryError onRetry={() => void detail.refetch()} />;

  const units = detail.data.units;
  const onUnitsDrag = (event: DragEndEvent) => {
    if (!event.over || event.active.id === event.over.id) return;
    const ids = units.map((unit) => unit.id);
    const next = arrayMove(
      ids,
      ids.indexOf(String(event.active.id)),
      ids.indexOf(String(event.over.id)),
    );
    reorderUnits.mutate(next);
  };

  return (
    <div className="space-y-6">
      <Link
        to={`/teacher/classes/${classId}/${subjectId}`}
        className="text-sm text-muted no-underline hover:text-accent"
      >
        {t('teacher.backToClass')}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">
        {t('teacher.builder')} · {detail.data.className} {detail.data.subjectName}
      </h1>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <TextField name="unitTitle" value={unitTitle} onChange={setUnitTitle} className="min-w-48 flex-1">
              <Label>{t('teacher.unitTitle')}</Label>
              <Input />
            </TextField>
            <Button variant="secondary" className="self-end" onPress={() => addUnit.mutate()}>
              {t('teacher.addUnit')}
            </Button>
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onUnitsDrag}>
            <SortableContext items={units.map((unit) => unit.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {units.map((unit) => (
                  <SortableRow key={unit.id} id={unit.id}>
                    <div className="rounded-xl border border-border bg-surface p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <UnitTitleField
                          id={unit.id}
                          title={unit.title}
                          onSave={(id, title) => renameUnit.mutate({ id, title })}
                        />
                        <div className="flex gap-2">
                          <Button size="sm" variant="secondary" onPress={() => addLesson.mutate(unit.id)}>
                            {t('teacher.addLesson')}
                          </Button>
                          <Modal>
                            <Button size="sm" variant="danger">
                              {t('teacher.delete')}
                            </Button>
                            <Modal.Backdrop>
                              <Modal.Container>
                                <Modal.Dialog>
                                  <Modal.Header>
                                    <Modal.Heading>{t('teacher.deleteConfirm')}</Modal.Heading>
                                  </Modal.Header>
                                  <Modal.Footer>
                                    <Button slot="close" variant="tertiary">
                                      {t('teacher.cancel')}
                                    </Button>
                                    <Button
                                      variant="danger"
                                      onPress={() => deleteUnit.mutate(unit.id)}
                                    >
                                      {t('teacher.delete')}
                                    </Button>
                                  </Modal.Footer>
                                </Modal.Dialog>
                              </Modal.Container>
                            </Modal.Backdrop>
                          </Modal>
                        </div>
                      </div>
                      <LessonList
                        lessons={unit.lessons}
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                        onReorder={(ids) => reorderLessons.mutate({ unitId: unit.id, ids })}
                      />
                    </div>
                  </SortableRow>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        {selectedId ? (
          <LessonEditor
            lessonId={selectedId}
            onChanged={() => {
              void invalidate();
              void queryClient.invalidateQueries({ queryKey: ['teacher-lesson', selectedId] });
            }}
          />
        ) : (
          <p className="text-sm text-muted">{t('teacher.pickLesson')}</p>
        )}
      </div>
    </div>
  );
}

function LessonList({
  lessons,
  selectedId,
  onSelect,
  onReorder,
}: {
  lessons: TeacherClassDetail['units'][number]['lessons'];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (ids: string[]) => void;
}) {
  const { t } = useTranslation();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const ids = lessons.map((lesson) => lesson.id);
  const onDragEnd = (event: DragEndEvent) => {
    if (!event.over || event.active.id === event.over.id) return;
    onReorder(
      arrayMove(ids, ids.indexOf(String(event.active.id)), ids.indexOf(String(event.over.id))),
    );
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {lessons.map((lesson) => (
            <SortableRow key={lesson.id} id={lesson.id}>
              <button
                type="button"
                className={`w-full rounded-lg border px-3 py-2 text-start text-sm ${
                  selectedId === lesson.id ? 'border-accent bg-accent/10' : 'border-border'
                }`}
                onClick={() => onSelect(lesson.id)}
              >
                <span className="font-medium">{lesson.title}</span>
                <Chip size="sm" variant="soft" className="ms-2" color={lesson.publishedAt ? 'success' : 'default'}>
                  {lesson.publishedAt ? t('teacher.published') : t('teacher.draft')}
                </Chip>
              </button>
            </SortableRow>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function LessonEditor({ lessonId, onChanged }: { lessonId: string; onChanged: () => void }) {
  const { t } = useTranslation();
  const query = useQuery({
    queryKey: ['teacher-lesson', lessonId],
    queryFn: () => apiFetch<TeacherLessonDetail>(`/teacher/lessons/${lessonId}`),
  });
  const [title, setTitle] = useState('');
  const [type, setType] = useState<LessonType>('RICH_TEXT');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const timer = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!query.data) return;
    setTitle(query.data.title);
    setType(query.data.type);
    setBody(query.data.body ?? '');
    setUrl(query.data.url ?? '');
  }, [query.data]);

  const save = useMutation({
    mutationFn: (payload: { title: string; type: LessonType; body: string; url: string }) =>
      apiFetch(`/teacher/lessons/${lessonId}`, { method: 'PATCH', body: JSON.stringify(payload) }),
    onSuccess: () => {
      toast.success(t('teacher.saved'));
      onChanged();
    },
  });

  const scheduleSave = (next: { title: string; type: LessonType; body: string; url: string }) => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => save.mutate(next), 800);
  };

  const publish = useMutation({
    mutationFn: () => apiFetch(`/teacher/lessons/${lessonId}/publish`, { method: 'POST' }),
    onSuccess: onChanged,
  });
  const unpublish = useMutation({
    mutationFn: () => apiFetch(`/teacher/lessons/${lessonId}/unpublish`, { method: 'POST' }),
    onSuccess: onChanged,
  });
  const remove = useMutation({
    mutationFn: () => apiFetch(`/teacher/lessons/${lessonId}`, { method: 'DELETE' }),
    onSuccess: onChanged,
  });
  const upload = useMutation({
    mutationFn: async (file: File) => {
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
    onSuccess: onChanged,
  });

  if (query.isLoading) return <QueryLoading />;
  if (query.isError || !query.data) return <QueryError onRetry={() => void query.refetch()} />;

  const published = Boolean(query.data.publishedAt);

  return (
    <div className="space-y-4 rounded-xl border border-border p-4">
      <TextField
        name="lessonTitle"
        value={title}
        onChange={(value) => {
          setTitle(value);
          scheduleSave({ title: value, type, body, url });
        }}
      >
        <Label>{t('teacher.lessonTitle')}</Label>
        <Input />
      </TextField>
      <label className="grid gap-1 text-sm">
        <span>{t('teacher.lessonType')}</span>
        <select
          className="rounded-lg border border-border bg-background px-3 py-2"
          value={type}
          onChange={(event) => {
            const next = event.target.value as LessonType;
            setType(next);
            scheduleSave({ title, type: next, body, url });
          }}
        >
          {TYPES.map((item) => (
            <option key={item} value={item}>
              {t(`teacher.types.${item}`)}
            </option>
          ))}
        </select>
      </label>
      {type === 'RICH_TEXT' ? (
        <TextField
          name="body"
          value={body}
          onChange={(value) => {
            setBody(value);
            scheduleSave({ title, type, body: value, url });
          }}
        >
          <Label>{t('teacher.lessonBody')}</Label>
          <TextArea rows={8} />
        </TextField>
      ) : (
        <TextField
          name="url"
          value={url}
          onChange={(value) => {
            setUrl(value);
            scheduleSave({ title, type, body, url: value });
          }}
        >
          <Label>{t('teacher.lessonUrl')}</Label>
          <Input />
        </TextField>
      )}

      <p className="text-sm text-muted">{t('teacher.fileHint')}</p>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file && file.size <= MAX_BYTES) upload.mutate(file);
          event.target.value = '';
        }}
      />
      <Button variant="secondary" size="sm" onPress={() => inputRef.current?.click()}>
        {t('teacher.addMaterial')}
      </Button>
      {query.data.materials.map((file) => (
        <p key={file.id} className="text-sm text-muted">
          {file.fileName}
        </p>
      ))}

      <div className="flex flex-wrap gap-2">
        {published ? (
          <Button variant="secondary" onPress={() => unpublish.mutate()}>
            {t('teacher.unpublish')}
          </Button>
        ) : (
          <Button variant="primary" onPress={() => publish.mutate()}>
            {t('teacher.publish')}
          </Button>
        )}
        <Modal>
          <Button variant="danger">{t('teacher.delete')}</Button>
          <Modal.Backdrop>
            <Modal.Container>
              <Modal.Dialog>
                <Modal.Header>
                  <Modal.Heading>{t('teacher.deleteConfirm')}</Modal.Heading>
                </Modal.Header>
                <Modal.Footer>
                  <Button slot="close" variant="tertiary">
                    {t('teacher.cancel')}
                  </Button>
                  <Button variant="danger" onPress={() => remove.mutate()}>
                    {t('teacher.delete')}
                  </Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      </div>
    </div>
  );
}
