/**
 * Editor hooks - ghost hint visibility logic
 */
import { useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';
import type { SlashPhase } from '../domain';
import { isStrictSlashTriggerEligible } from '../ui/menus/slashEligibility';

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
    let rafId: number | null = null;

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
        y: rect.top - 2,
      });
    };

    const scheduleGhostHintUpdate = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        updateGhostHint();
      });
    };

    const hideGhostHint = () => {
      setPosition({ open: false, x: 0, y: 0 });
    };

    updateGhostHint();
    let editorDom: HTMLElement | null = null;
    try {
      editorDom = editor.view?.dom as HTMLElement | null;
    } catch {
      // Editor view not yet available
    }
    const scrollContainer = editorDom?.closest('.editor-content-area');
    editor.on('selectionUpdate', updateGhostHint);
    editor.on('transaction', updateGhostHint);
    editor.on('focus', updateGhostHint);
    editor.on('blur', hideGhostHint);
    scrollContainer?.addEventListener('scroll', scheduleGhostHintUpdate, {
      passive: true,
    });
    window.addEventListener('resize', scheduleGhostHintUpdate);

    return () => {
      editor.off('selectionUpdate', updateGhostHint);
      editor.off('transaction', updateGhostHint);
      editor.off('focus', updateGhostHint);
      editor.off('blur', hideGhostHint);
      scrollContainer?.removeEventListener('scroll', scheduleGhostHintUpdate);
      window.removeEventListener('resize', scheduleGhostHintUpdate);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    };
  }, [editor, getSafeCoordsAtPos, slashPhase]);

  return position;
}
