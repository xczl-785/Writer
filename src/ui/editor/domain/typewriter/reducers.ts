import type { TypewriterEventEnvelope } from './events';
import {
  hasCrossedOrTouchedThreshold,
  isInputChainEventType,
  isMovementPayload,
  shouldDowngradeLockedStateForExternalUpwardCompensation,
} from './guards';
import {
  createInitialTypewriterState,
  createLockedTypewriterState,
  type TypewriterState,
} from './typewriterStateMachine';

const isForceFreeEventType = (eventType: TypewriterEventEnvelope['type']) =>
  eventType === 'force-free' ||
  eventType === 'mouse-caret-placed' ||
  eventType === 'find-jump' ||
  eventType === 'outline-jump' ||
  eventType === 'programmatic-selection';

export const reduceTypewriterState = (
  state: TypewriterState,
  event: TypewriterEventEnvelope,
): TypewriterState => {
  if (isForceFreeEventType(event.type)) {
    return {
      ...createInitialTypewriterState(),
      lastTrigger: event.source,
    };
  }

  if (event.type === 'viewport-measured') {
    if (
      event.payload &&
      'isTypewriterActive' in event.payload &&
      !event.payload.isTypewriterActive
    ) {
      return {
        ...createInitialTypewriterState(),
        lastTrigger: event.source,
      };
    }
    return {
      ...state,
      lastTrigger: event.source,
    };
  }

  if (!isInputChainEventType(event.type) || !isMovementPayload(event.payload)) {
    return {
      ...state,
      lastTrigger: event.source,
    };
  }

  if (
    shouldDowngradeLockedStateForExternalUpwardCompensation({
      state,
      source: event.source,
      caretTop: event.payload.nextCaretTop,
    })
  ) {
    return {
      ...createInitialTypewriterState(),
      lastTrigger: event.source,
    };
  }

  if (state.mode === 'locked') {
    return {
      ...state,
      lastTrigger: event.source,
    };
  }

  if (
    hasCrossedOrTouchedThreshold({
      previousCaretTop: event.payload.previousCaretTop,
      nextCaretTop: event.payload.nextCaretTop,
      thresholdY: event.payload.thresholdY,
    })
  ) {
    return createLockedTypewriterState(
      event.payload.nextCaretTop,
      event.source,
    );
  }

  return {
    ...state,
    lastTrigger: event.source,
  };
};

export const dispatchTypewriterEvent = (
  state: TypewriterState,
  event: TypewriterEventEnvelope,
): TypewriterState => reduceTypewriterState(state, event);
