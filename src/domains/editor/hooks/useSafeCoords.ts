/**
 * Editor hooks - utility for getting safe coordinates at position
 */
import { useCallback } from 'react';
import type { Editor } from '@tiptap/react';

/**
 * Creates a safe coordinate getter that handles ProseMirror errors
 */
export function useSafeCoords() {
  const getSafeCoordsAtPos = useCallback((editor: Editor, pos: number) => {
    try {
      return editor.view.coordsAtPos(pos);
    } catch {
      return null;
    }
  }, []);

  return { getSafeCoordsAtPos };
}
