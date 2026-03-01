/**
 * Editor Bubble Menu Component
 *
 * A floating toolbar that appears when text is selected,
 * providing quick formatting options.
 *
 * @see docs/current/PM/V5 功能清单.md - INT-011: 编辑器右键菜单
 * @see docs/current/UI/UI_UX规范.md - 3.1 上下文菜单
 */

import React from 'react';
import type { Editor } from '@tiptap/react';
import { Bold, Italic, Strikethrough, Code, Link } from 'lucide-react';

export interface BubbleMenuProps {
  /** TipTap editor instance */
  editor: Editor | null;
  /** Currently selected text */
  selectedText?: string;
}

/**
 * Format button configuration
 */
interface FormatButton {
  id: string;
  label: string;
  icon: React.ReactNode;
  isActive: (editor: Editor) => boolean;
  action: (editor: Editor) => void;
}

const formatButtons: FormatButton[] = [
  {
    id: 'bold',
    label: 'Bold',
    icon: <Bold size={14} />,
    isActive: (editor) => editor.isActive('bold'),
    action: (editor) => editor.chain().focus().toggleBold().run(),
  },
  {
    id: 'italic',
    label: 'Italic',
    icon: <Italic size={14} />,
    isActive: (editor) => editor.isActive('italic'),
    action: (editor) => editor.chain().focus().toggleItalic().run(),
  },
  {
    id: 'strike',
    label: 'Strikethrough',
    icon: <Strikethrough size={14} />,
    isActive: (editor) => editor.isActive('strike'),
    action: (editor) => editor.chain().focus().toggleStrike().run(),
  },
  {
    id: 'code',
    label: 'Inline Code',
    icon: <Code size={14} />,
    isActive: (editor) => editor.isActive('code'),
    action: (editor) => editor.chain().focus().toggleCode().run(),
  },
  {
    id: 'link',
    label: 'Link',
    icon: <Link size={14} />,
    isActive: (editor) => editor.isActive('link'),
    action: (editor) => {
      const url = window.prompt('Enter URL:');
      if (url) {
        editor.chain().focus().setLink({ href: url }).run();
      }
    },
  },
];

/**
 * Editor Bubble Menu Component
 */
export const EditorBubbleMenu: React.FC<BubbleMenuProps> = ({ editor }) => {
  if (!editor) return null;

  return (
    <div className="flex items-center gap-0.5 rounded-md border border-zinc-200 bg-white px-1 py-0.5 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
      {formatButtons.map((button) => {
        const isActive = button.isActive(editor);

        return (
          <button
            key={button.id}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              button.action(editor);
            }}
            className={`
              flex items-center justify-center
              w-7 h-7 rounded
              transition-colors duration-150 ease-out
              ${
                isActive
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700'
              }
            `}
            title={button.label}
            aria-label={button.label}
            aria-pressed={isActive}
          >
            {button.icon}
          </button>
        );
      })}
    </div>
  );
};
