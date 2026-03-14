/**
 * Editor hooks - undo/redo with status feedback
 */
import { useCallback } from 'react';
import type { Editor } from '@tiptap/react';

export function useUndoRedo(setTransientStatus: (message: string) => void) {
  const undo = useCallback(
    (editor: Editor) => {
      const ran = editor.chain().focus().undo().run();
      if (ran) setTransientStatus('Undo');
      return ran;
    },
    [setTransientStatus],
  );

  const redo = useCallback(
    (editor: Editor) => {
      const ran = editor.chain().focus().redo().run();
      if (ran) setTransientStatus('Redo');
      return ran;
    },
    [setTransientStatus],
  );

  return { undo, redo };
}
