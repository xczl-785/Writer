export type TypewriterMode = 'free' | 'locked';

export type TypewriterState = {
  mode: TypewriterMode;
  dynamicAnchorY: number | null;
  lastCaretY: number | null;
};

export type TypewriterEvent =
  | {
      type: 'input-chain-move';
      caretY: number;
      thresholdY: number;
    }
  | {
      type: 'mouse-caret-placement';
    }
  | {
      type: 'non-input-jump';
    }
  | {
      type: 'reset';
    };

export const createInitialTypewriterState = (): TypewriterState => ({
  mode: 'free',
  dynamicAnchorY: null,
  lastCaretY: null,
});

const isThresholdTouchedOrCrossed = (
  previousCaretY: number | null,
  nextCaretY: number,
  thresholdY: number,
): boolean => {
  if (nextCaretY === thresholdY) {
    return true;
  }
  if (previousCaretY === null) {
    return false;
  }
  const previousDelta = previousCaretY - thresholdY;
  const nextDelta = nextCaretY - thresholdY;
  if (previousDelta === 0 || nextDelta === 0) {
    return true;
  }
  return previousDelta < 0 ? nextDelta > 0 : nextDelta < 0;
};

export const reduceTypewriterState = (
  state: TypewriterState,
  event: TypewriterEvent,
): TypewriterState => {
  switch (event.type) {
    case 'reset':
      return createInitialTypewriterState();
    case 'mouse-caret-placement':
    case 'non-input-jump':
      return createInitialTypewriterState();
    case 'input-chain-move': {
      if (state.mode === 'locked') {
        return {
          ...state,
          lastCaretY: event.caretY,
        };
      }

      if (
        isThresholdTouchedOrCrossed(
          state.lastCaretY,
          event.caretY,
          event.thresholdY,
        )
      ) {
        return {
          mode: 'locked',
          dynamicAnchorY: event.caretY,
          lastCaretY: event.caretY,
        };
      }

      return {
        ...state,
        lastCaretY: event.caretY,
      };
    }
    default:
      return state;
  }
};

export const computeLockedCompensationScrollTop = ({
  currentScrollTop,
  caretY,
  dynamicAnchorY,
}: {
  currentScrollTop: number;
  caretY: number;
  dynamicAnchorY: number;
}): number => {
  const delta = caretY - dynamicAnchorY;
  return Math.max(0, Math.round(currentScrollTop + delta));
};
