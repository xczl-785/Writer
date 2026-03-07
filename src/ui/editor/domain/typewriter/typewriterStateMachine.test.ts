import { describe, expect, it } from 'vitest';
import {
  createInitialTypewriterState,
  createLockedTypewriterState,
  reduceTypewriterInputMovement,
  computeLockedTypewriterTargetScrollTop,
} from './typewriterStateMachine';

describe('typewriterStateMachine', () => {
  it('starts in free mode without dynamic anchor', () => {
    expect(createInitialTypewriterState()).toEqual({
      mode: 'free',
      dynamicAnchorY: null,
    });
  });

  it('captures dynamic anchor when free mode movement crosses threshold downward', () => {
    const next = reduceTypewriterInputMovement(
      createInitialTypewriterState(),
      {
        previousCaretTop: 320,
        nextCaretTop: 460,
        thresholdY: 450,
      },
    );
    expect(next).toEqual({
      mode: 'locked',
      dynamicAnchorY: 460,
    });
  });

  it('captures dynamic anchor when free mode movement crosses threshold upward', () => {
    const next = reduceTypewriterInputMovement(
      createInitialTypewriterState(),
      {
        previousCaretTop: 520,
        nextCaretTop: 440,
        thresholdY: 450,
      },
    );
    expect(next).toEqual({
      mode: 'locked',
      dynamicAnchorY: 440,
    });
  });

  it('keeps locked mode stable and does not drift anchor', () => {
    const locked = createLockedTypewriterState(455);
    expect(
      reduceTypewriterInputMovement(locked, {
        previousCaretTop: 455,
        nextCaretTop: 468,
        thresholdY: 450,
      }),
    ).toEqual(locked);
  });

  it('computes locked compensation against dynamic anchor', () => {
    expect(
      computeLockedTypewriterTargetScrollTop({
        currentScrollTop: 280,
        caretTop: 470,
        dynamicAnchorY: 455,
      }),
    ).toBe(295);
  });
});
