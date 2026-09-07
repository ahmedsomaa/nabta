import { FileText, Film, Image as ImageIcon, Link2, Presentation } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

/** Keep in sync with `STUDENT_SUBMISSION_MIME` in `packages/validation`. */
export const DEFAULT_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/** Keep in sync with `UNTITLED_ASSIGNMENT_TITLE` in `packages/validation`. */
export const UNTITLED_ASSIGNMENT_TITLE = 'Untitled assignment';

const PPT_MIME = new Set([
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

export function looksLikeHtml(value: string) {
  return /<[a-z][\s\S]*>/i.test(value);
}

export function stripAssignmentHtml(html: string) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export function AssignmentInstructions({ html, className }: { html: string; className?: string }) {
  const trimmed = html.trim();
  if (!trimmed) return null;
  if (!looksLikeHtml(trimmed)) {
    return <p className={cn('whitespace-pre-wrap text-sm', className)}>{trimmed}</p>;
  }
  return (
    <div
      className={cn(
        'text-sm [&_a]:text-accent [&_a]:underline [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:ps-5 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:ps-5',
        className,
      )}
      dangerouslySetInnerHTML={{ __html: trimmed }}
    />
  );
}

export function formatBytes(size: number) {
  if (size <= 0) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) {
    const kb = size / 1024;
    return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  }
  const mb = size / (1024 * 1024);
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

export function attachmentIcon(mimeType: string, url?: string | null): LucideIcon {
  if (url || mimeType === 'text/uri-list') return Link2;
  if (mimeType.startsWith('video/')) return Film;
  if (PPT_MIME.has(mimeType)) return Presentation;
  if (mimeType.startsWith('image/')) return ImageIcon;
  return FileText;
}

export function mimeShortLabel(mimeType: string) {
  if (mimeType === 'text/uri-list') return 'URL';
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType === 'image/jpeg') return 'JPG';
  if (mimeType === 'image/png') return 'PNG';
  if (mimeType === 'image/webp') return 'WEBP';
  if (mimeType === 'text/plain') return 'TXT';
  if (mimeType === 'application/msword') return 'DOC';
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'DOCX';
  if (PPT_MIME.has(mimeType)) return 'PPT';
  if (mimeType.startsWith('video/')) return 'Video';
  return mimeType.split('/')[1]?.toUpperCase() ?? 'File';
}

export const SUBMISSION_MIME_OPTIONS = DEFAULT_ALLOWED_MIME_TYPES.map((mimeType) => ({
  mimeType,
  label: mimeShortLabel(mimeType),
}));

export function toLocalInput(iso: string | null | undefined) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function toDateInput(iso: string | null | undefined) {
  return toLocalInput(iso).slice(0, 10);
}

export function toTimeInput(iso: string | null | undefined) {
  return toLocalInput(iso).slice(11, 16);
}

export function fromDateAndTime(date: string, time: string) {
  if (!date) return null;
  const stamp = new Date(`${date}T${time || '16:00'}`);
  if (Number.isNaN(stamp.getTime())) return null;
  return stamp.toISOString();
}
