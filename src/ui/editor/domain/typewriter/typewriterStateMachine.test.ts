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
      lastTrigger: null,
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
      lastTrigger: 'input',
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
      lastTrigger: 'input',
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

  it('completes input flow from free movement to locked compensation', () => {
    const initial = createInitialTypewriterState();
    const stillFree = reduceTypewriterInputMovement(initial, {
      previousCaretTop: 300,
      nextCaretTop: 360,
      thresholdY: 450,
    });
    expect(stillFree.mode).toBe('free');

    const locked = reduceTypewriterInputMovement(stillFree, {
      previousCaretTop: 430,
      nextCaretTop: 455,
      thresholdY: 450,
    });
    expect(locked).toEqual({
      mode: 'locked',
      dynamicAnchorY: 455,
      lastTrigger: 'input',
    });

    expect(
      computeLockedTypewriterTargetScrollTop({
        currentScrollTop: 100,
        caretTop: 470,
        dynamicAnchorY: 455,
      }),
    ).toBe(115);
  });
});
