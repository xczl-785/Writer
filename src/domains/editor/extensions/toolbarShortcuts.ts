/**
 * Editor extensions - keyboard shortcuts for toolbar commands
 */
import { Extension } from '@tiptap/core';
import type { Editor as TiptapEditor } from '@tiptap/react';
import { TOOLBAR_COMMANDS, type ToolbarCommandId } from '../core/constants';

type EditorRef = { current: TiptapEditor | null };

export function createToolbarShortcutExtension(
  toolbarCommandRunnerRef: {
    current: (id: ToolbarCommandId) => boolean;
  },
  editorRef: EditorRef,
) {
  return Extension.create({
    name: 'editor-toolbar-shortcuts',
    addKeyboardShortcuts() {
      const shortcuts: Record<string, () => boolean> = {};

      // Register toolbar command shortcuts
      for (const cmd of TOOLBAR_COMMANDS) {
        if (!cmd.shortcut) continue;
        shortcuts[cmd.shortcut] = () => toolbarCommandRunnerRef.current(cmd.id);
      }

      // Register heading shortcuts (Mod-1 to Mod-6)
      for (let i = 1; i <= 6; i++) {
        shortcuts[`Mod-${i}`] = () => {
          if (editorRef.current) {
            return editorRef.current
              .chain()
              .focus()
              .toggleHeading({ level: i as 1 | 2 | 3 | 4 | 5 | 6 })
              .run();
          }
          return false;
        };
      }

      return shortcuts;
    },
  });
}
