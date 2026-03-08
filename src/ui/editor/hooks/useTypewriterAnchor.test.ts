import { describe, expect, it } from 'vitest';
import {
  shouldSkipTypewriterScrollAdjustment,
  shouldThrottleTypewriterTypingUpdate,
  resolveEditorContentTopOffset,
  shouldActivateTypewriterAnchor,
  computeTypewriterTargetScrollTop,
  shouldForceFreeOnMouseCaretPlacement,
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

  it('keeps current scroll when cursor stays inside deadband', () => {
    const next = computeTypewriterTargetScrollTop({
      currentScrollTop: 240,
      containerTop: 100,
      containerHeight: 800,
      cursorTop: 467,
      anchorRatio: 0.45,
    });
    expect(next).toBe(240);
  });

  it('parses non-negative editor content top offset from css variable', () => {
    const element = document.createElement('div');
    element.style.setProperty('--editor-content-offset-top', '18px');
    document.body.appendChild(element);
    expect(resolveEditorContentTopOffset(element)).toBe(18);
    element.style.setProperty('--editor-content-offset-top', '-7px');
    expect(resolveEditorContentTopOffset(element)).toBe(0);
    element.remove();
  });

  it('skips tiny scroll adjustments below min delta', () => {
    expect(shouldSkipTypewriterScrollAdjustment(201, 200)).toBe(true);
    expect(shouldSkipTypewriterScrollAdjustment(205, 200)).toBe(true);
    expect(shouldSkipTypewriterScrollAdjustment(206, 200)).toBe(false);
  });

  it('throttles typing updates within configured interval', () => {
    expect(shouldThrottleTypewriterTypingUpdate(1000, 900)).toBe(true);
    expect(shouldThrottleTypewriterTypingUpdate(1020, 900)).toBe(false);
  });

  it('forces free mode only when primary click produces a new caret placement', () => {
    expect(
      shouldForceFreeOnMouseCaretPlacement({
        isPrimaryButton: true,
        isInsideEditorContent: true,
        selectionBefore: 10,
        selectionAfter: 25,
      }),
    ).toBe(true);
    expect(
      shouldForceFreeOnMouseCaretPlacement({
        isPrimaryButton: true,
        isInsideEditorContent: true,
        selectionBefore: 10,
        selectionAfter: 10,
      }),
    ).toBe(false);
    expect(
      shouldForceFreeOnMouseCaretPlacement({
        isPrimaryButton: true,
        isInsideEditorContent: false,
        selectionBefore: 10,
        selectionAfter: 25,
      }),
    ).toBe(false);
  });
});
