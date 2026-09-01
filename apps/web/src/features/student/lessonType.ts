import type { LucideIcon } from 'lucide-react';
import { File, FileText, Image, Link, Video } from 'lucide-react';
import type { LessonType } from '@nabta/types';

export const LESSON_TYPE_ICON: Record<LessonType, LucideIcon> = {
  RICH_TEXT: FileText,
  VIDEO: Video,
  PDF: File,
  IMAGE: Image,
  EXTERNAL: Link,
};

export function lessonTypeKey(type: LessonType) {
  return `student.types.${type}`;
}
