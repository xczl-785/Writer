import { useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import {
  computeLockedCompensationScrollTop,
  computeTypewriterTargetScrollTop,
  createInitialTypewriterState,
  DEFAULT_TYPEWRITER_ANCHOR_RATIO,
  findScrollContainer,
  reduceTypewriterState,
  resolveEditorContentTopOffset,
  setScrollTop,
  shouldActivateTypewriterAnchor,
  shouldSkipScrollAdjustment,
  TYPEWRITER_NON_INPUT_JUMP_EVENT,
  type TypewriterNonInputJumpPayload,
} from '../domain';

export { computeTypewriterTargetScrollTop, shouldActivateTypewriterAnchor };
export const DEFAULT_TYPEWRITER_SCROLL_MIN_DELTA_PX = 6;
export const DEFAULT_TYPEWRITER_TYPING_THROTTLE_MS = 120;
export const DEFAULT_TYPEWRITER_COMPENSATION_DURATION_MS = 120;
export const DEFAULT_TYPEWRITER_REVERSE_JUMP_DEGRADE_PX = 96;

export const shouldSkipTypewriterScrollAdjustment = shouldSkipScrollAdjustment;

export const shouldThrottleTypewriterTypingUpdate = (
  nowMs: number,
  lastTypingUpdateAtMs: number,
  throttleMs = DEFAULT_TYPEWRITER_TYPING_THROTTLE_MS,
) => nowMs - lastTypingUpdateAtMs < throttleMs;

export const shouldDegradeTypewriterLockedMode = (
  targetScrollTop: number,
  currentScrollTop: number,
  maxReverseJumpPx = DEFAULT_TYPEWRITER_REVERSE_JUMP_DEGRADE_PX,
) => currentScrollTop - targetScrollTop > maxReverseJumpPx;

export const easeOutCubic = (progress: number): number => {
  const clamped = Math.min(1, Math.max(0, progress));
  return 1 - (1 - clamped) ** 3;
};

export const interpolateTypewriterCompensationScrollTop = ({
  from,
  to,
  progress,
}: {
  from: number;
  to: number;
  progress: number;
}) => Math.round(from + (to - from) * easeOutCubic(progress));

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
    let compensationRafId: number | null = null;
    let isComposing = false;
    let typewriterState = createInitialTypewriterState();
    let pendingUpdateMode: 'typing' | 'immediate' = 'immediate';
    let lastTypingUpdateAtMs = 0;
    let lastInputSignalAtMs = 0;

    const cancelPendingUpdate = () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
    };

    const cancelCompensationAnimation = () => {
      if (compensationRafId !== null) {
        window.cancelAnimationFrame(compensationRafId);
        compensationRafId = null;
      }
    };

    const animateCompensationTo = (
      scrollContainer: HTMLElement,
      targetScrollTop: number,
      durationMs = DEFAULT_TYPEWRITER_COMPENSATION_DURATION_MS,
    ) => {
      cancelCompensationAnimation();

      const startScrollTop = scrollContainer.scrollTop;
      if (
        shouldSkipTypewriterScrollAdjustment(targetScrollTop, startScrollTop)
      ) {
        return;
      }

      const maxScrollTop = Math.max(
        0,
        scrollContainer.scrollHeight - scrollContainer.clientHeight,
      );
      const clampedTargetScrollTop = Math.max(
        0,
        Math.min(targetScrollTop, maxScrollTop),
      );

      const animationStartAt = performance.now();
      const step = (now: number) => {
        const progress = Math.min(1, (now - animationStartAt) / durationMs);
        const nextScrollTop = interpolateTypewriterCompensationScrollTop({
          from: startScrollTop,
          to: clampedTargetScrollTop,
          progress,
        });
        setScrollTop(scrollContainer, nextScrollTop);

        if (progress < 1) {
          compensationRafId = window.requestAnimationFrame(step);
          return;
        }
        compensationRafId = null;
      };

      compensationRafId = window.requestAnimationFrame(step);
    };

    const resetToFreeMode = (
      eventType: 'mouse-caret-placement' | 'non-input-jump',
    ) => {
      typewriterState = reduceTypewriterState(typewriterState, {
        type: eventType,
      });
      cancelPendingUpdate();
      cancelCompensationAnimation();
    };

    const markInputSignal = () => {
      lastInputSignalAtMs = Date.now();
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
        typewriterState = reduceTypewriterState(typewriterState, {
          type: 'reset',
        });
        cancelCompensationAnimation();
        return;
      }

      const selectionPos = editor.state.selection.from;
      const coords = editor.view.coordsAtPos(selectionPos);
      const containerRect = scrollContainer.getBoundingClientRect();
      const thresholdY =
        containerRect.top + offsetTop + effectiveViewportHeight * anchorRatio;

      typewriterState = reduceTypewriterState(typewriterState, {
        type: 'input-chain-move',
        caretY: coords.top,
        thresholdY,
      });

      if (
        typewriterState.mode !== 'locked' ||
        typewriterState.dynamicAnchorY === null
      ) {
        return;
      }

      const targetScrollTop = computeLockedCompensationScrollTop({
        currentScrollTop: scrollContainer.scrollTop,
        caretY: coords.top,
        dynamicAnchorY: typewriterState.dynamicAnchorY,
      });

      const maxScrollTop = Math.max(
        0,
        scrollContainer.scrollHeight - scrollContainer.clientHeight,
      );
      const clampedTargetScrollTop = Math.max(
        0,
        Math.min(targetScrollTop, maxScrollTop),
      );

      if (
        shouldDegradeTypewriterLockedMode(
          clampedTargetScrollTop,
          scrollContainer.scrollTop,
        )
      ) {
        typewriterState = reduceTypewriterState(typewriterState, {
          type: 'non-input-jump',
        });
        cancelCompensationAnimation();
        return;
      }

      animateCompensationTo(scrollContainer, clampedTargetScrollTop);
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
      markInputSignal();
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
        markInputSignal();
        scheduleAnchorUpdate('immediate');
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      resetToFreeMode('mouse-caret-placement');
    };

    const handleNonInputJump = (event: Event) => {
      const customEvent = event as CustomEvent<TypewriterNonInputJumpPayload>;
      if (!customEvent.detail?.source) {
        return;
      }
      resetToFreeMode('non-input-jump');
    };

    const handleSelectionUpdate = () => {
      if (
        typewriterState.mode !== 'locked' ||
        typewriterState.dynamicAnchorY === null ||
        isComposing
      ) {
        return;
      }
      if (Date.now() - lastInputSignalAtMs < 150) {
        return;
      }

      const selectionPos = editor.state.selection.from;
      const coords = editor.view.coordsAtPos(selectionPos);
      const anchorDelta = Math.abs(coords.top - typewriterState.dynamicAnchorY);
      if (anchorDelta <= DEFAULT_TYPEWRITER_REVERSE_JUMP_DEGRADE_PX) {
        return;
      }
      resetToFreeMode('non-input-jump');
    };

    const handleCompositionStart = () => {
      isComposing = true;
    };

    const handleCompositionEnd = () => {
      isComposing = false;
      markInputSignal();
      lastTypingUpdateAtMs = Date.now();
      scheduleAnchorUpdate('typing');
    };

    editorDom?.addEventListener(
      'beforeinput',
      handleBeforeInput as EventListener,
    );
    editorDom?.addEventListener('keydown', handleKeyDown, true);
    editorDom?.addEventListener('mousedown', handleMouseDown, true);
    editorDom?.addEventListener('compositionstart', handleCompositionStart);
    editorDom?.addEventListener('compositionend', handleCompositionEnd);
    window.addEventListener(
      TYPEWRITER_NON_INPUT_JUMP_EVENT,
      handleNonInputJump as EventListener,
    );
    editor.on('selectionUpdate', handleSelectionUpdate);

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
      window.removeEventListener(
        TYPEWRITER_NON_INPUT_JUMP_EVENT,
        handleNonInputJump as EventListener,
      );
      editor.off('selectionUpdate', handleSelectionUpdate);
      cancelPendingUpdate();
      cancelCompensationAnimation();
    };
  }, [editor, enabled, anchorRatio]);
};
