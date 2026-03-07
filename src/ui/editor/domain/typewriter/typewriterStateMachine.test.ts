import { describe, expect, it } from 'vitest';
import {
  computeLockedCompensationScrollTop,
  createInitialTypewriterState,
  reduceTypewriterState,
} from './typewriterStateMachine';

describe('typewriterStateMachine', () => {
  it('enters locked mode when caret touches threshold from above', () => {
    let state = createInitialTypewriterState();
    state = reduceTypewriterState(state, {
      type: 'input-chain-move',
      caretY: 120,
      thresholdY: 200,
    });
    state = reduceTypewriterState(state, {
      type: 'input-chain-move',
      caretY: 200,
      thresholdY: 200,
    });

    expect(state.mode).toBe('locked');
    expect(state.dynamicAnchorY).toBe(200);
  });

  it('enters locked mode when caret crosses threshold from below', () => {
    let state = createInitialTypewriterState();
    state = reduceTypewriterState(state, {
      type: 'input-chain-move',
      caretY: 320,
      thresholdY: 200,
    });
    state = reduceTypewriterState(state, {
      type: 'input-chain-move',
      caretY: 180,
      thresholdY: 200,
    });

    expect(state.mode).toBe('locked');
    expect(state.dynamicAnchorY).toBe(180);
  });

  it('keeps dynamic anchor fixed while locked', () => {
    let state = createInitialTypewriterState();
    state = reduceTypewriterState(state, {
      type: 'input-chain-move',
      caretY: 180,
      thresholdY: 200,
    });
    state = reduceTypewriterState(state, {
      type: 'input-chain-move',
      caretY: 210,
      thresholdY: 200,
    });
    state = reduceTypewriterState(state, {
      type: 'input-chain-move',
      caretY: 240,
      thresholdY: 200,
    });

    expect(state.mode).toBe('locked');
    expect(state.dynamicAnchorY).toBe(210);
  });

  it('returns to free mode on mouse placement or non-input jump', () => {
    let state = {
      mode: 'locked' as const,
      dynamicAnchorY: 220,
      lastCaretY: 230,
    };

    state = reduceTypewriterState(state, { type: 'mouse-caret-placement' });
    expect(state.mode).toBe('free');
    expect(state.dynamicAnchorY).toBeNull();

    state = reduceTypewriterState(
      {
        mode: 'locked',
        dynamicAnchorY: 210,
        lastCaretY: 215,
      },
      { type: 'non-input-jump' },
    );
    expect(state.mode).toBe('free');
    expect(state.dynamicAnchorY).toBeNull();
  });

  it('computes locked compensation scroll top from dynamic anchor delta', () => {
    expect(
      computeLockedCompensationScrollTop({
        currentScrollTop: 200,
        caretY: 420,
        dynamicAnchorY: 380,
      }),
    ).toBe(240);
  });
});
