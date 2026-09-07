import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Button } from '@heroui/react';
import { Bold, Italic, Link2, List, ListOrdered, RemoveFormatting, Strikethrough, Underline as UnderlineIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export function AssignmentRichTextEditor({
  value,
  onChange,
  placeholder,
  invalid,
  compact,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  invalid?: boolean;
  compact?: boolean;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        code: false,
      }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder }),
    ],
    immediatelyRender: false,
    content: value || '',
    onUpdate: ({ editor: instance }) => {
      const html = instance.getHTML();
      onChange(html === '<p></p>' ? '' : html);
    },
    editorProps: {
      attributes: {
        class:
          cn(
            'assignment-editor px-3 py-2 text-sm outline-none [&_a]:text-accent [&_a]:underline [&_ol]:list-decimal [&_ol]:ps-5 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:ps-5',
            compact ? 'min-h-[88px]' : 'min-h-[180px]',
          ),
      },
    },
  });

  useEffect(() => {
    if (!editor || editor.isFocused) return;
    const current = editor.getHTML() === '<p></p>' ? '' : editor.getHTML();
    if (current !== value) editor.commands.setContent(value || '', { emitUpdate: false });
  }, [editor, value]);

  const setLink = () => {
    if (!editor) return;
    const previous = editor.getAttributes('link').href as string | undefined;
    const next = window.prompt('URL', previous ?? 'https://');
    if (next == null) return;
    const trimmed = next.trim();
    if (!trimmed) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: trimmed }).run();
  };

  return (
    <div
      className={cn(
        'assignment-rich-text overflow-hidden rounded-lg border bg-background',
        invalid ? 'border-danger' : 'border-border',
      )}
    >
      <style>{`
        .assignment-rich-text .tiptap p.is-empty:first-child::before {
          color: var(--muted);
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>
      <div className="flex flex-wrap gap-0.5 border-b border-border px-1.5 py-1">
        <ToolbarButton
          label="Bold"
          active={editor?.isActive('bold')}
          onPress={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor?.isActive('italic')}
          onPress={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          active={editor?.isActive('underline')}
          onPress={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Strikethrough"
          active={editor?.isActive('strike')}
          onPress={() => editor?.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Bulleted list"
          active={editor?.isActive('bulletList')}
          onPress={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={editor?.isActive('orderedList')}
          onPress={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Link" active={editor?.isActive('link')} onPress={setLink}>
          <Link2 className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Clear formatting"
          onPress={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}
        >
          <RemoveFormatting className="size-3.5" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  label,
  active,
  onPress,
  children,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      size="sm"
      isIconOnly
      variant={active ? 'secondary' : 'ghost'}
      aria-label={label}
      onPress={onPress}
    >
      {children}
    </Button>
  );
}
