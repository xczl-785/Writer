export type TypewriterMode = 'free' | 'locked';

export type TypewriterState = {
  mode: TypewriterMode;
  dynamicAnchorY: number | null;
};

export const createInitialTypewriterState = (): TypewriterState => ({
  mode: 'free',
  dynamicAnchorY: null,
});

export const createLockedTypewriterState = (
  dynamicAnchorY: number,
): TypewriterState => ({
  mode: 'locked',
  dynamicAnchorY,
});

const hasCrossedOrTouchedThreshold = ({
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
    return state;
  }

  if (
    hasCrossedOrTouchedThreshold({ previousCaretTop, nextCaretTop, thresholdY })
  ) {
    return createLockedTypewriterState(nextCaretTop);
  }

  return state;
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
