import type { TriggerSource } from './events';
import { hasCrossedOrTouchedThreshold } from './guards';

export type TypewriterMode = 'free' | 'locked';

export type TypewriterState = {
  mode: TypewriterMode;
  dynamicAnchorY: number | null;
  lastTrigger: TriggerSource | null;
};

export const createInitialTypewriterState = (): TypewriterState => ({
  mode: 'free',
  dynamicAnchorY: null,
  lastTrigger: null,
});

export const createLockedTypewriterState = (
  dynamicAnchorY: number,
  lastTrigger: TriggerSource = 'input',
): TypewriterState => ({
  mode: 'locked',
  dynamicAnchorY,
  lastTrigger,
});

export const reduceTypewriterInputMovement = (
  state: TypewriterState,
  {
    previousCaretTop,
    nextCaretTop,
    thresholdY,
  }: {
    previousCaretTop: number;
    nextCaretTop: number;
    thresholdY: number;
  },
): TypewriterState => {
  if (state.mode === 'locked') {
    return {
      ...state,
      lastTrigger: 'input',
    };
  }

  if (
    hasCrossedOrTouchedThreshold({ previousCaretTop, nextCaretTop, thresholdY })
  ) {
    return createLockedTypewriterState(nextCaretTop, 'input');
  }

  return {
    ...state,
    lastTrigger: 'input',
  };
};

export const computeLockedTypewriterTargetScrollTop = ({
  currentScrollTop,
  caretTop,
  dynamicAnchorY,
}: {
  currentScrollTop: number;
  caretTop: number;
  dynamicAnchorY: number;
}) => {
  const delta = caretTop - dynamicAnchorY;
  return Math.max(0, Math.round(currentScrollTop + delta));
};
