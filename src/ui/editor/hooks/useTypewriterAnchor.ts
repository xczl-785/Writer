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
  computeLockedTypewriterTargetScrollTop,
  TYPEWRITER_FORCE_FREE_EVENT,
  createTypewriterEventEnvelope,
  dispatchTypewriterEvent,
  shouldDowngradeLockedStateForExternalUpwardCompensation,
  type TriggerSource,
  type TypewriterEventType,
  type TypewriterForceFreeReason,
} from '../domain';

export { computeTypewriterTargetScrollTop, shouldActivateTypewriterAnchor };
export const DEFAULT_TYPEWRITER_SCROLL_MIN_DELTA_PX = 6;
export const DEFAULT_TYPEWRITER_TYPING_THROTTLE_MS = 120;
export const TYPEWRITER_COMPENSATION_ANIMATION_MS = 140;

export const shouldSkipTypewriterScrollAdjustment = shouldSkipScrollAdjustment;

export const shouldThrottleTypewriterTypingUpdate = (
  nowMs: number,
  lastTypingUpdateAtMs: number,
  throttleMs = DEFAULT_TYPEWRITER_TYPING_THROTTLE_MS,
) => nowMs - lastTypingUpdateAtMs < throttleMs;

export const resolveMovementBaselineCaretTop = ({
  previousCaretTop,
  caretTopBeforeInputMutation,
}: {
  previousCaretTop: number | null;
  caretTopBeforeInputMutation: number | null;
}) =>
  caretTopBeforeInputMutation !== null
    ? caretTopBeforeInputMutation
    : previousCaretTop;

export const shouldDowngradeLockedModeForUpwardCompensation = ({
  triggerSource,
  caretTop,
  dynamicAnchorY,
}: {
  triggerSource: TriggerSource;
  caretTop: number;
  dynamicAnchorY: number;
}) =>
  shouldDowngradeLockedStateForExternalUpwardCompensation({
    state: {
      mode: 'locked',
      dynamicAnchorY,
      lastTrigger: triggerSource,
    },
    source: triggerSource,
    caretTop,
  });

export const shouldForceFreeOnMouseCaretPlacement = ({
  isPrimaryButton,
  isInsideEditorContent,
  selectionBefore,
  selectionAfter,
}: {
  isPrimaryButton: boolean;
  isInsideEditorContent: boolean;
  selectionBefore: number;
  selectionAfter: number;
}) =>
  isPrimaryButton &&
  isInsideEditorContent &&
  selectionAfter !== selectionBefore;

export const shouldCaptureLockOnActivationEdge = ({
  wasTypewriterActive,
  isTypewriterActive,
  nextCaretTop,
  thresholdY,
  triggerSource,
}: {
  wasTypewriterActive: boolean;
  isTypewriterActive: boolean;
  nextCaretTop: number;
  thresholdY: number;
  triggerSource: TriggerSource;
}) =>
  !wasTypewriterActive &&
  isTypewriterActive &&
  triggerSource !== 'external' &&
  nextCaretTop >= thresholdY;

export { resolveEditorContentTopOffset };

const mapForceFreeReasonToEventType = (
  reason: TypewriterForceFreeReason,
): TypewriterEventType => {
  if (reason === 'editor-click') {
    return 'mouse-caret-placed';
  }
  if (reason === 'find-navigation') {
    return 'find-jump';
  }
  if (reason === 'outline-navigation') {
    return 'outline-jump';
  }
  return 'programmatic-selection';
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
    let animationRafId: number | null = null;
    let isComposing = false;
    let pendingUpdateMode: 'typing' | 'immediate' = 'immediate';
    let lastTypingUpdateAtMs = 0;
    let typewriterState = createInitialTypewriterState();
    let previousCaretTop: number | null = null;
    let caretTopBeforeInputMutation: number | null = null;
    let lastAnchorUpdateTriggerSource: TriggerSource = 'input';
    let lastAnchorUpdateEventType: TypewriterEventType = 'before-input';
    let pointerSelectionSnapshot: number | null = null;
    let pointerFromEditorContent = false;
    let wasTypewriterActive = false;

    const clearCompensationAnimation = () => {
      if (animationRafId !== null) {
        window.cancelAnimationFrame(animationRafId);
        animationRafId = null;
      }
    };

    const captureCaretTopSnapshot = () => {
      try {
        const selectionPos = editor.state.selection.from;
        const coords = editor.view.coordsAtPos(selectionPos);
        caretTopBeforeInputMutation = coords.top;
      } catch {
        caretTopBeforeInputMutation = null;
      }
    };

    const transitionToState = (nextState: typeof typewriterState) => {
      if (typewriterState.mode === 'locked' && nextState.mode === 'free') {
        clearCompensationAnimation();
      }
      typewriterState = nextState;
    };

    const resetToFreeMode = (source: TriggerSource) => {
      transitionToState(
        dispatchTypewriterEvent(
          typewriterState,
          createTypewriterEventEnvelope({
            type: 'force-free',
            source,
          }),
        ),
      );
      previousCaretTop = null;
    };

    const animateScrollTop = (
      scrollContainer: HTMLElement,
      targetScrollTop: number,
    ) => {
      clearCompensationAnimation();

      const startScrollTop = scrollContainer.scrollTop;
      const delta = targetScrollTop - startScrollTop;
      if (Math.abs(delta) < 1) {
        setScrollTop(scrollContainer, targetScrollTop);
        return;
      }

      const startAtMs = window.performance.now();
      const animateStep = (nowMs: number) => {
        const elapsed = nowMs - startAtMs;
        const progress = Math.min(
          1,
          elapsed / TYPEWRITER_COMPENSATION_ANIMATION_MS,
        );
        const eased = 1 - (1 - progress) * (1 - progress) * (1 - progress);
        setScrollTop(scrollContainer, Math.round(startScrollTop + delta * eased));
        if (progress < 1) {
          animationRafId = window.requestAnimationFrame(animateStep);
          return;
        }
        animationRafId = null;
      };

      animationRafId = window.requestAnimationFrame(animateStep);
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

      const isTypewriterActive = shouldActivateTypewriterAnchor({
        enabled,
        contentHeight: editorDom.scrollHeight,
        viewportHeight: effectiveViewportHeight,
      });

      transitionToState(
        dispatchTypewriterEvent(
          typewriterState,
          createTypewriterEventEnvelope({
            type: 'viewport-measured',
            source: 'external',
            payload: { isTypewriterActive },
          }),
        ),
      );

      if (!isTypewriterActive) {
        wasTypewriterActive = false;
        previousCaretTop = null;
        caretTopBeforeInputMutation = null;
        return;
      }

      const selectionPos = editor.state.selection.from;
      const coords = editor.view.coordsAtPos(selectionPos);
      const containerRect = scrollContainer.getBoundingClientRect();

      const thresholdY =
        containerRect.top + offsetTop + effectiveViewportHeight * anchorRatio;

      if (
        shouldCaptureLockOnActivationEdge({
          wasTypewriterActive,
          isTypewriterActive,
          nextCaretTop: coords.top,
          thresholdY,
          triggerSource: lastAnchorUpdateTriggerSource,
        })
      ) {
        transitionToState(
          dispatchTypewriterEvent(
            typewriterState,
            createTypewriterEventEnvelope({
              type: lastAnchorUpdateEventType,
              source: lastAnchorUpdateTriggerSource,
              payload: {
                previousCaretTop: thresholdY,
                nextCaretTop: coords.top,
                thresholdY,
              },
            }),
          ),
        );
      }

      const movementBaselineCaretTop = resolveMovementBaselineCaretTop({
        previousCaretTop,
        caretTopBeforeInputMutation,
      });

      if (movementBaselineCaretTop !== null) {
        const movementEvent = createTypewriterEventEnvelope({
          type: lastAnchorUpdateEventType,
          source: lastAnchorUpdateTriggerSource,
          payload: {
            previousCaretTop: movementBaselineCaretTop,
            nextCaretTop: coords.top,
            thresholdY,
          },
        });
        const nextState = dispatchTypewriterEvent(typewriterState, movementEvent);
        transitionToState(nextState);

        if (
          typewriterState.mode === 'free' &&
          lastAnchorUpdateTriggerSource === 'external'
        ) {
          previousCaretTop = coords.top;
          caretTopBeforeInputMutation = null;
          return;
        }
      }
      caretTopBeforeInputMutation = null;

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
          animateScrollTop(scrollContainer, targetScrollTop);
        }
      }

      previousCaretTop = coords.top;
      wasTypewriterActive = true;
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
      captureCaretTopSnapshot();
      lastAnchorUpdateTriggerSource = 'input';
      lastAnchorUpdateEventType = 'before-input';
      if (event.inputType === 'insertText') {
        scheduleAnchorUpdate('typing');
        return;
      }
      if (
        event.inputType === 'insertParagraph' ||
        event.inputType === 'insertLineBreak'
      ) {
        lastAnchorUpdateEventType = 'enter-keydown';
        scheduleAnchorUpdate('immediate');
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        captureCaretTopSnapshot();
        lastAnchorUpdateTriggerSource = 'input';
        lastAnchorUpdateEventType = 'enter-keydown';
        scheduleAnchorUpdate('immediate');
        return;
      }
      if (event.key.startsWith('Arrow')) {
        captureCaretTopSnapshot();
        lastAnchorUpdateTriggerSource = 'arrow';
        lastAnchorUpdateEventType = 'arrow-keydown';
        scheduleAnchorUpdate('immediate');
      }
    };
    const handleCompositionStart = () => {
      isComposing = true;
      lastAnchorUpdateTriggerSource = 'ime';
      lastAnchorUpdateEventType = 'composition-start';
    };
    const handleCompositionEnd = () => {
      isComposing = false;
      lastAnchorUpdateTriggerSource = 'ime';
      lastAnchorUpdateEventType = 'composition-end';
      lastTypingUpdateAtMs = Date.now();
      scheduleAnchorUpdate('immediate');
    };
    const handleMouseDown = (event: MouseEvent) => {
      if (!(event.target instanceof Node)) {
        pointerSelectionSnapshot = null;
        pointerFromEditorContent = false;
        return;
      }
      pointerFromEditorContent = editorDom?.contains(event.target) ?? false;
      pointerSelectionSnapshot = editor.state.selection.from;
      if (event.button !== 0 || !pointerFromEditorContent) {
        return;
      }
    };
    const clearPointerSelectionSnapshot = () => {
      pointerSelectionSnapshot = null;
      pointerFromEditorContent = false;
    };
    const handleSelectionChange = () => {
      if (pointerSelectionSnapshot === null) {
        return;
      }
      if (
        shouldForceFreeOnMouseCaretPlacement({
          isPrimaryButton: true,
          isInsideEditorContent: pointerFromEditorContent,
          selectionBefore: pointerSelectionSnapshot,
          selectionAfter: editor.state.selection.from,
        })
      ) {
        transitionToState(
          dispatchTypewriterEvent(
            typewriterState,
            createTypewriterEventEnvelope({
              type: 'mouse-caret-placed',
              source: 'mouse',
            }),
          ),
        );
        previousCaretTop = null;
      }
      clearPointerSelectionSnapshot();
    };
    const handleForceFree = (event: Event) => {
      const customEvent = event as CustomEvent<{ reason: TypewriterForceFreeReason }>;
      lastAnchorUpdateTriggerSource = 'external';
      lastAnchorUpdateEventType = mapForceFreeReasonToEventType(
        customEvent.detail?.reason ?? 'programmatic-selection',
      );
      transitionToState(
        dispatchTypewriterEvent(
          typewriterState,
          createTypewriterEventEnvelope({
            type: lastAnchorUpdateEventType,
            source: 'external',
          }),
        ),
      );
      previousCaretTop = null;
    };
    editorDom?.addEventListener(
      'beforeinput',
      handleBeforeInput as EventListener,
    );
    editorDom?.addEventListener('keydown', handleKeyDown, true);
    editorDom?.addEventListener('mousedown', handleMouseDown, true);
    editorDom?.addEventListener('mouseup', clearPointerSelectionSnapshot, true);
    editorDom?.addEventListener('compositionstart', handleCompositionStart);
    editorDom?.addEventListener('compositionend', handleCompositionEnd);
    document.addEventListener('selectionchange', handleSelectionChange);
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
        'mouseup',
        clearPointerSelectionSnapshot,
        true,
      );
      editorDom?.removeEventListener(
        'compositionstart',
        handleCompositionStart,
      );
      editorDom?.removeEventListener('compositionend', handleCompositionEnd);
      document.removeEventListener('selectionchange', handleSelectionChange);
      window.removeEventListener(TYPEWRITER_FORCE_FREE_EVENT, handleForceFree);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      clearCompensationAnimation();
      resetToFreeMode('external');
    };
  }, [editor, enabled, anchorRatio]);
};
