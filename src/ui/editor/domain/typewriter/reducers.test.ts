import { describe, expect, it } from 'vitest';
import { createTypewriterEventEnvelope } from './events';
import { dispatchTypewriterEvent, reduceTypewriterState } from './reducers';
import {
  createInitialTypewriterState,
  createLockedTypewriterState,
} from './typewriterStateMachine';

describe('typewriter reducers', () => {
  it('locks from free mode when movement crosses threshold', () => {
    const next = reduceTypewriterState(
      createInitialTypewriterState(),
      createTypewriterEventEnvelope({
        type: 'before-input',
        source: 'input',
        payload: {
          previousCaretTop: 320,
          nextCaretTop: 460,
          thresholdY: 450,
        },
      }),
    );

    expect(next).toEqual({
      mode: 'locked',
      dynamicAnchorY: 460,
      lastTrigger: 'input',
    });
  });

  it('returns to free mode for forced fallback events', () => {
    const next = reduceTypewriterState(
      createLockedTypewriterState(455, 'input'),
      createTypewriterEventEnvelope({
        type: 'find-jump',
        source: 'external',
      }),
    );

    expect(next).toEqual({
      mode: 'free',
      dynamicAnchorY: null,
      lastTrigger: 'external',
    });
  });

  it('downgrades locked mode for external upward compensation', () => {
    const next = dispatchTypewriterEvent(
      createLockedTypewriterState(455, 'input'),
      createTypewriterEventEnvelope({
        type: 'selection-changed',
        source: 'external',
        payload: {
          previousCaretTop: 460,
          nextCaretTop: 430,
          thresholdY: 450,
        },
      }),
    );

    expect(next.mode).toBe('free');
    expect(next.dynamicAnchorY).toBeNull();
    expect(next.lastTrigger).toBe('external');
  });

  it('keeps free mode when viewport cannot activate typewriter', () => {
    const next = reduceTypewriterState(
      createInitialTypewriterState(),
      createTypewriterEventEnvelope({
        type: 'viewport-measured',
        source: 'external',
        payload: {
          isTypewriterActive: false,
        },
      }),
    );

    expect(next).toEqual({
      mode: 'free',
      dynamicAnchorY: null,
      lastTrigger: 'external',
    });
  });
});

