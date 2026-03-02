/**
 * Editor hooks - ghost hint visibility logic
 */
import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import type { SlashPhase } from '../menus/SlashMenu';
import { isStrictSlashTriggerEligible } from '../menus/slashEligibility';

export type GhostHintPosition = {
  open: boolean;
  x: number;
  y: number;
};

export function useGhostHint(
  editor: Editor | null,
  slashPhase: SlashPhase,
  getSafeCoordsAtPos: (
    editor: Editor,
    pos: number,
  ) => { left: number; top: number } | null,
) {
  const [position, setPosition] = useState<GhostHintPosition>({
    open: false,
    x: 0,
    y: 0,
  });

  useEffect(() => {
    if (!editor) return;

    const updateGhostHint = () => {
      if (!editor.isFocused || slashPhase !== 'idle') {
        setPosition({ open: false, x: 0, y: 0 });
        return;
      }

      if (!isStrictSlashTriggerEligible(editor)) {
        setPosition({ open: false, x: 0, y: 0 });
        return;
      }

      const { selection } = editor.state;
      const rect = getSafeCoordsAtPos(editor, selection.from);
      if (!rect) {
        setPosition({ open: false, x: 0, y: 0 });
        return;
      }

      setPosition({
        open: true,
        x: rect.left + 4,
        y: rect.top + 2,
      });
    };

    const hideGhostHint = () => {
      setPosition({ open: false, x: 0, y: 0 });
    };

    updateGhostHint();
    editor.on('selectionUpdate', updateGhostHint);
    editor.on('transaction', updateGhostHint);
    editor.on('focus', updateGhostHint);
    editor.on('blur', hideGhostHint);

    return () => {
      editor.off('selectionUpdate', updateGhostHint);
      editor.off('transaction', updateGhostHint);
      editor.off('focus', updateGhostHint);
      editor.off('blur', hideGhostHint);
    };
  }, [editor, getSafeCoordsAtPos, slashPhase]);

  return position;
}
