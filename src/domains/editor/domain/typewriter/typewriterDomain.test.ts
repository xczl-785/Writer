import { describe, expect, it } from 'vitest';
import {
  computeTypewriterTargetScrollTop,
  DEFAULT_TYPEWRITER_ANCHOR_DEADBAND_PX,
  shouldActivateTypewriterAnchor,
} from './typewriterDomain';

describe('typewriterDomain', () => {
  it('does not activate anchor scroll for short content', () => {
    expect(
      shouldActivateTypewriterAnchor({
        enabled: true,
        contentHeight: 640,
        viewportHeight: 640,
      }),
    ).toBe(false);
  });

  it('keeps scroll position inside anchor deadband', () => {
    const target = computeTypewriterTargetScrollTop({
      currentScrollTop: 180,
      containerTop: 100,
      containerHeight: 800,
      cursorTop: 460 + DEFAULT_TYPEWRITER_ANCHOR_DEADBAND_PX,
      anchorRatio: 0.45,
    });
    expect(target).toBe(180);
  });

  it('adjusts scroll position when cursor exceeds anchor deadband', () => {
    const target = computeTypewriterTargetScrollTop({
      currentScrollTop: 180,
      containerTop: 100,
      containerHeight: 800,
      cursorTop: 510,
      anchorRatio: 0.45,
    });
    expect(target).toBe(230);
  });
});
