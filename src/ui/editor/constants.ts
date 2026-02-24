import type { Editor as TiptapEditor } from '@tiptap/react';
import { EDITOR_CONFIG } from '../../config/editor';

export const FIND_MATCH_LIMIT = EDITOR_CONFIG.findReplace.maxMatches;

export const DEFAULT_TABLE_INSERT = {
  rows: EDITOR_CONFIG.table.defaultRows,
  cols: EDITOR_CONFIG.table.defaultCols,
  withHeaderRow: true,
} as const;

export type ToolbarCommandId =
  | 'bold'
  | 'italic'
  | 'inlineCode'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'heading4'
  | 'heading5'
  | 'heading6'
  | 'bulletList'
  | 'orderedList'
  | 'blockquote'
  | 'codeBlock'
  | 'insertTable'
  | 'addTableRow'
  | 'deleteTableRow'
  | 'addTableColumn'
  | 'deleteTableColumn'
  | 'deleteTable';

export type ToolbarCommandSpec = {
  id: ToolbarCommandId;
  label: string;
  ariaLabel: string;
  shortcut: string;
  isActive: (editor: TiptapEditor) => boolean;
  canRun: (editor: TiptapEditor) => boolean;
  run: (editor: TiptapEditor) => boolean;
};

export const TOOLBAR_COMMANDS: readonly ToolbarCommandSpec[] = [
  {
    id: 'bold',
    label: 'B',
    ariaLabel: 'Bold',
    shortcut: 'Mod-b',
    isActive: (editor) => editor.isActive('bold'),
    canRun: (editor) => editor.can().chain().focus().toggleBold().run(),
    run: (editor) => editor.chain().focus().toggleBold().run(),
  },
  {
    id: 'italic',
    label: 'I',
    ariaLabel: 'Italic',
    shortcut: 'Mod-i',
    isActive: (editor) => editor.isActive('italic'),
    canRun: (editor) => editor.can().chain().focus().toggleItalic().run(),
    run: (editor) => editor.chain().focus().toggleItalic().run(),
  },
  {
    id: 'inlineCode',
    label: '</>',
    ariaLabel: 'Inline code',
    shortcut: 'Mod-e',
    isActive: (editor) => editor.isActive('code'),
    canRun: (editor) => editor.can().chain().focus().toggleCode().run(),
    run: (editor) => editor.chain().focus().toggleCode().run(),
  },
  {
    id: 'heading1',
    label: 'H1',
    ariaLabel: 'Heading 1',
    shortcut: 'Mod-Alt-1',
    isActive: (editor) => editor.isActive('heading', { level: 1 }),
    canRun: (editor) =>
      editor.can().chain().focus().toggleHeading({ level: 1 }).run(),
    run: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: 'heading2',
    label: 'H2',
    ariaLabel: 'Heading 2',
    shortcut: 'Mod-Alt-2',
    isActive: (editor) => editor.isActive('heading', { level: 2 }),
    canRun: (editor) =>
      editor.can().chain().focus().toggleHeading({ level: 2 }).run(),
    run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: 'heading3',
    label: 'H3',
    ariaLabel: 'Heading 3',
    shortcut: 'Mod-Alt-3',
    isActive: (editor) => editor.isActive('heading', { level: 3 }),
    canRun: (editor) =>
      editor.can().chain().focus().toggleHeading({ level: 3 }).run(),
    run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: 'heading4',
    label: 'H4',
    ariaLabel: 'Heading 4',
    shortcut: 'Mod-Alt-4',
    isActive: (editor) => editor.isActive('heading', { level: 4 }),
    canRun: (editor) =>
      editor.can().chain().focus().toggleHeading({ level: 4 }).run(),
    run: (editor) => editor.chain().focus().toggleHeading({ level: 4 }).run(),
  },
  {
    id: 'heading5',
    label: 'H5',
    ariaLabel: 'Heading 5',
    shortcut: 'Mod-Alt-5',
    isActive: (editor) => editor.isActive('heading', { level: 5 }),
    canRun: (editor) =>
      editor.can().chain().focus().toggleHeading({ level: 5 }).run(),
    run: (editor) => editor.chain().focus().toggleHeading({ level: 5 }).run(),
  },
  {
    id: 'heading6',
    label: 'H6',
    ariaLabel: 'Heading 6',
    shortcut: 'Mod-Alt-6',
    isActive: (editor) => editor.isActive('heading', { level: 6 }),
    canRun: (editor) =>
      editor.can().chain().focus().toggleHeading({ level: 6 }).run(),
    run: (editor) => editor.chain().focus().toggleHeading({ level: 6 }).run(),
  },
  {
    id: 'bulletList',
    label: 'Bul',
    ariaLabel: 'Bullet list',
    shortcut: 'Mod-Alt-b',
    isActive: (editor) => editor.isActive('bulletList'),
    canRun: (editor) => editor.can().chain().focus().toggleBulletList().run(),
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'orderedList',
    label: 'Num',
    ariaLabel: 'Ordered list',
    shortcut: 'Mod-Alt-o',
    isActive: (editor) => editor.isActive('orderedList'),
    canRun: (editor) => editor.can().chain().focus().toggleOrderedList().run(),
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: 'blockquote',
    label: 'Quote',
    ariaLabel: 'Blockquote',
    shortcut: 'Mod-Alt-q',
    isActive: (editor) => editor.isActive('blockquote'),
    canRun: (editor) => editor.can().chain().focus().toggleBlockquote().run(),
    run: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    id: 'codeBlock',
    label: 'Block',
    ariaLabel: 'Code block',
    shortcut: 'Mod-Alt-c',
    isActive: (editor) => editor.isActive('codeBlock'),
    canRun: (editor) => editor.can().chain().focus().toggleCodeBlock().run(),
    run: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: 'insertTable',
    label: 'Tbl',
    ariaLabel: 'Insert table',
    shortcut: 'Mod-t',
    isActive: (editor) => editor.isActive('table'),
    canRun: (editor) =>
      editor.can().chain().focus().insertTable(DEFAULT_TABLE_INSERT).run(),
    run: (editor) =>
      editor.chain().focus().insertTable(DEFAULT_TABLE_INSERT).run(),
  },
  {
    id: 'addTableRow',
    label: '+R',
    ariaLabel: 'Add row',
    shortcut: '',
    isActive: () => false,
    canRun: (editor) => editor.can().chain().focus().addRowAfter().run(),
    run: (editor) => editor.chain().focus().addRowAfter().run(),
  },
  {
    id: 'deleteTableRow',
    label: '-R',
    ariaLabel: 'Delete row',
    shortcut: '',
    isActive: () => false,
    canRun: (editor) => editor.can().chain().focus().deleteRow().run(),
    run: (editor) => editor.chain().focus().deleteRow().run(),
  },
  {
    id: 'addTableColumn',
    label: '+C',
    ariaLabel: 'Add column',
    shortcut: '',
    isActive: () => false,
    canRun: (editor) => editor.can().chain().focus().addColumnAfter().run(),
    run: (editor) => editor.chain().focus().addColumnAfter().run(),
  },
  {
    id: 'deleteTableColumn',
    label: '-C',
    ariaLabel: 'Delete column',
    shortcut: '',
    isActive: () => false,
    canRun: (editor) => editor.can().chain().focus().deleteColumn().run(),
    run: (editor) => editor.chain().focus().deleteColumn().run(),
  },
  {
    id: 'deleteTable',
    label: 'Del Tbl',
    ariaLabel: 'Delete table',
    shortcut: '',
    isActive: () => false,
    canRun: (editor) => editor.can().chain().focus().deleteTable().run(),
    run: (editor) => editor.chain().focus().deleteTable().run(),
  },
];
