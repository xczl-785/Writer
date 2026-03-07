import { useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import {
  computeTypewriterTargetScrollTop,
  DEFAULT_TYPEWRITER_ANCHOR_RATIO,
  shouldActivateTypewriterAnchor,
  resolveEditorContentTopOffset,
  findScrollContainer,
  setScrollTop,
  shouldSkipScrollAdjustment,
  createInitialTypewriterState,
  reduceTypewriterInputMovement,
  computeLockedTypewriterTargetScrollTop,
  TYPEWRITER_FORCE_FREE_EVENT,
} from '../domain';

export { computeTypewriterTargetScrollTop, shouldActivateTypewriterAnchor };
export const DEFAULT_TYPEWRITER_SCROLL_MIN_DELTA_PX = 6;
export const DEFAULT_TYPEWRITER_TYPING_THROTTLE_MS = 120;

export const shouldSkipTypewriterScrollAdjustment = shouldSkipScrollAdjustment;

export const shouldThrottleTypewriterTypingUpdate = (
  nowMs: number,
  lastTypingUpdateAtMs: number,
  throttleMs = DEFAULT_TYPEWRITER_TYPING_THROTTLE_MS,
) => nowMs - lastTypingUpdateAtMs < throttleMs;

export { resolveEditorContentTopOffset };

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
    let typewriterState = createInitialTypewriterState();
    let previousCaretTop: number | null = null;
    const resetToFreeMode = () => {
      typewriterState = createInitialTypewriterState();
      previousCaretTop = null;
    };

    const updateAnchor = () => {
      if (isComposing) {
        return;
      }

      const editorDom = editor.view.dom as HTMLElement | null;
      const scrollContainer = editorDom ? findScrollContainer(editorDom) : null;
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
        resetToFreeMode();
        return;
      }

      const selectionPos = editor.state.selection.from;
      const coords = editor.view.coordsAtPos(selectionPos);
      const containerRect = scrollContainer.getBoundingClientRect();

      const thresholdY =
        containerRect.top + offsetTop + effectiveViewportHeight * anchorRatio;

      if (previousCaretTop !== null) {
        typewriterState = reduceTypewriterInputMovement(typewriterState, {
          previousCaretTop,
          nextCaretTop: coords.top,
          thresholdY,
        });
      }

      if (
        typewriterState.mode === 'locked' &&
        typewriterState.dynamicAnchorY !== null
      ) {
        const targetScrollTop = computeLockedTypewriterTargetScrollTop({
          currentScrollTop: scrollContainer.scrollTop,
          caretTop: coords.top,
          dynamicAnchorY: typewriterState.dynamicAnchorY,
        });

        if (
          !shouldSkipTypewriterScrollAdjustment(
            targetScrollTop,
            scrollContainer.scrollTop,
          )
        ) {
          setScrollTop(scrollContainer, targetScrollTop);
        }
      }

      previousCaretTop = coords.top;
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
          if (shouldThrottleTypewriterTypingUpdate(now, lastTypingUpdateAtMs)) {
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
      lastTypingUpdateAtMs = Date.now();
      scheduleAnchorUpdate('immediate');
    };
    const handleMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) {
        return;
      }
      resetToFreeMode();
    };
    const handleForceFree = () => {
      resetToFreeMode();
    };
    editorDom?.addEventListener(
      'beforeinput',
      handleBeforeInput as EventListener,
    );
    editorDom?.addEventListener('keydown', handleKeyDown, true);
    editorDom?.addEventListener('mousedown', handleMouseDown, true);
    editorDom?.addEventListener('compositionstart', handleCompositionStart);
    editorDom?.addEventListener('compositionend', handleCompositionEnd);
    window.addEventListener(TYPEWRITER_FORCE_FREE_EVENT, handleForceFree);
    scheduleAnchorUpdate('immediate');

    return () => {
      editorDom?.removeEventListener(
        'beforeinput',
        handleBeforeInput as EventListener,
      );
      editorDom?.removeEventListener('keydown', handleKeyDown, true);
      editorDom?.removeEventListener('mousedown', handleMouseDown, true);
      editorDom?.removeEventListener(
        'compositionstart',
        handleCompositionStart,
      );
      editorDom?.removeEventListener('compositionend', handleCompositionEnd);
      window.removeEventListener(TYPEWRITER_FORCE_FREE_EVENT, handleForceFree);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    };
  }, [editor, enabled, anchorRatio]);
};
