import type { TriggerSource, TypewriterEventEnvelope } from './events';
import type { TypewriterState } from './typewriterStateMachine';

export const hasCrossedOrTouchedThreshold = ({
  previousCaretTop,
  nextCaretTop,
  thresholdY,
}: {
  previousCaretTop: number;
  nextCaretTop: number;
  thresholdY: number;
}) =>
  Math.min(previousCaretTop, nextCaretTop) <= thresholdY &&
  Math.max(previousCaretTop, nextCaretTop) >= thresholdY;

export const isInputChainEventType = (
  eventType: TypewriterEventEnvelope['type'],
) =>
  eventType === 'before-input' ||
  eventType === 'enter-keydown' ||
  eventType === 'arrow-keydown' ||
  eventType === 'composition-end' ||
  eventType === 'selection-changed';

export const isMovementPayload = (
  payload: TypewriterEventEnvelope['payload'],
): payload is {
  previousCaretTop: number;
  nextCaretTop: number;
  thresholdY: number;
} =>
  Boolean(
    payload &&
      'previousCaretTop' in payload &&
      'nextCaretTop' in payload &&
      'thresholdY' in payload,
  );

export const shouldDowngradeLockedStateForExternalUpwardCompensation = ({
  state,
  source,
  caretTop,
}: {
  state: TypewriterState;
  source: TriggerSource;
  caretTop: number;
}) =>
  state.mode === 'locked' &&
  state.dynamicAnchorY !== null &&
  source === 'external' &&
  caretTop < state.dynamicAnchorY;

