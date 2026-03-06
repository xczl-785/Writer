import { useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import {
  computeTypewriterTargetScrollTop,
  DEFAULT_TYPEWRITER_ANCHOR_RATIO,
  shouldActivateTypewriterAnchor,
} from '../domain';

export { computeTypewriterTargetScrollTop, shouldActivateTypewriterAnchor };
export const DEFAULT_TYPEWRITER_SCROLL_MIN_DELTA_PX = 6;
export const DEFAULT_TYPEWRITER_TYPING_THROTTLE_MS = 120;

export const shouldSkipTypewriterScrollAdjustment = (
  targetScrollTop: number,
  currentScrollTop: number,
  minDeltaPx = DEFAULT_TYPEWRITER_SCROLL_MIN_DELTA_PX,
) => Math.abs(targetScrollTop - currentScrollTop) < minDeltaPx;

export const shouldThrottleTypewriterTypingUpdate = (
  nowMs: number,
  lastTypingUpdateAtMs: number,
  throttleMs = DEFAULT_TYPEWRITER_TYPING_THROTTLE_MS,
) => nowMs - lastTypingUpdateAtMs < throttleMs;

export const resolveEditorContentTopOffset = (element: HTMLElement): number => {
  const rawValue = getComputedStyle(element)
    .getPropertyValue('--editor-content-offset-top')
    .trim();
  const parsed = Number.parseFloat(rawValue);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.max(0, parsed);
};

export const useTypewriterAnchor = ({
  editor,
  enabled,
  anchorRatio = DEFAULT_TYPEWRITER_ANCHOR_RATIO,
}: {
  editor: Editor | null;
  enabled: boolean;
  anchorRatio?: number;
}) => {
  useEffect(() => {
    if (!editor || !enabled) return;

    let rafId: number | null = null;
    let isComposing = false;
    let pendingUpdateMode: 'typing' | 'immediate' = 'immediate';
    let lastTypingUpdateAtMs = 0;

    const updateAnchor = () => {
      if (isComposing) {
        return;
      }

      const editorDom = editor.view.dom as HTMLElement | null;
      const scrollContainer = editorDom?.closest('.editor-content-area') as
        | HTMLElement
        | null;
      if (!editorDom || !scrollContainer) {
        return;
      }

      const offsetTop = Math.min(
        resolveEditorContentTopOffset(scrollContainer),
        Math.max(0, scrollContainer.clientHeight - 1),
      );
      const effectiveViewportHeight = Math.max(
        1,
        scrollContainer.clientHeight - offsetTop,
      );

      if (
        !shouldActivateTypewriterAnchor({
          enabled,
          contentHeight: editorDom.scrollHeight,
          viewportHeight: effectiveViewportHeight,
        })
      ) {
        return;
      }

      const selectionPos = editor.state.selection.from;
      const coords = editor.view.coordsAtPos(selectionPos);
      const containerRect = scrollContainer.getBoundingClientRect();
      const targetScrollTop = computeTypewriterTargetScrollTop({
        currentScrollTop: scrollContainer.scrollTop,
        containerTop: containerRect.top + offsetTop,
        containerHeight: effectiveViewportHeight,
        cursorTop: coords.top,
        anchorRatio,
      });

      if (
        shouldSkipTypewriterScrollAdjustment(
          targetScrollTop,
          scrollContainer.scrollTop,
        )
      ) {
        return;
      }
      scrollContainer.scrollTop = targetScrollTop;
    };

    const scheduleAnchorUpdate = (
      mode: 'typing' | 'immediate' = 'immediate',
    ) => {
      if (mode === 'immediate') {
        pendingUpdateMode = 'immediate';
      } else if (pendingUpdateMode !== 'immediate') {
        pendingUpdateMode = 'typing';
      }
      if (rafId !== null) {
        return;
      }
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        if (pendingUpdateMode === 'typing') {
          const now = Date.now();
          if (
            shouldThrottleTypewriterTypingUpdate(now, lastTypingUpdateAtMs)
          ) {
            return;
          }
          lastTypingUpdateAtMs = now;
        }
        pendingUpdateMode = 'immediate';
        updateAnchor();
      });
    };

    const editorDom = editor.view.dom as HTMLElement | null;
    const handleBeforeInput = (event: InputEvent) => {
      if (event.isComposing) return;
      if (event.inputType === 'insertText') {
        scheduleAnchorUpdate('typing');
        return;
      }
      if (
        event.inputType === 'insertParagraph' ||
        event.inputType === 'insertLineBreak'
      ) {
        scheduleAnchorUpdate('immediate');
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.startsWith('Arrow')) {
        scheduleAnchorUpdate('immediate');
      }
    };
    const handleCompositionStart = () => {
      isComposing = true;
    };
    const handleCompositionEnd = () => {
      isComposing = false;
      scheduleAnchorUpdate('immediate');
    };
    const handleSelectionUpdate = () => {
      scheduleAnchorUpdate('typing');
    };
    const handleTransaction = () => {
      scheduleAnchorUpdate('typing');
    };

    editor.on('selectionUpdate', handleSelectionUpdate);
    editor.on('transaction', handleTransaction);
    editorDom?.addEventListener('beforeinput', handleBeforeInput as EventListener);
    editorDom?.addEventListener('keydown', handleKeyDown, true);
    editorDom?.addEventListener('compositionstart', handleCompositionStart);
    editorDom?.addEventListener('compositionend', handleCompositionEnd);
    scheduleAnchorUpdate('immediate');

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
      editor.off('transaction', handleTransaction);
      editorDom?.removeEventListener(
        'beforeinput',
        handleBeforeInput as EventListener,
      );
      editorDom?.removeEventListener('keydown', handleKeyDown, true);
      editorDom?.removeEventListener('compositionstart', handleCompositionStart);
      editorDom?.removeEventListener('compositionend', handleCompositionEnd);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    };
  }, [editor, enabled, anchorRatio]);
};
