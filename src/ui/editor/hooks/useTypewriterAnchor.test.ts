import { describe, expect, it } from 'vitest';
import {
  shouldActivateTypewriterAnchor,
  computeTypewriterTargetScrollTop,
} from './useTypewriterAnchor';

describe('typewriter anchor helpers', () => {
  it('activates only when enabled and content exceeds viewport height', () => {
    expect(
      shouldActivateTypewriterAnchor({
        enabled: true,
        contentHeight: 1200,
        viewportHeight: 800,
      }),
    ).toBe(true);
    expect(
      shouldActivateTypewriterAnchor({
        enabled: true,
        contentHeight: 600,
        viewportHeight: 800,
      }),
    ).toBe(false);
    expect(
      shouldActivateTypewriterAnchor({
        enabled: false,
        contentHeight: 1200,
        viewportHeight: 800,
      }),
    ).toBe(false);
  });

  it('computes scroll target that keeps cursor near 45% anchor', () => {
    const next = computeTypewriterTargetScrollTop({
      currentScrollTop: 200,
      containerTop: 100,
      containerHeight: 800,
      cursorTop: 650,
      anchorRatio: 0.45,
    });
    expect(next).toBe(390);
  });
});

