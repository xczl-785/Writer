import type { Editor } from '@tiptap/react';

export function isStrictSlashTriggerEligible(editor: Editor): boolean {
  if (!editor.isFocused) return false;
  if (editor.isActive('codeBlock')) return false;

  const { selection } = editor.state;
  if (!selection.empty) return false;

  const $from = selection.$from;
  if ($from.depth !== 1) return false;
  if ($from.parent.type.name !== 'paragraph') return false;
  return $from.parent.content.size === 0;
}
