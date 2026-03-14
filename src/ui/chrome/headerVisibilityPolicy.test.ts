import { describe, expect, it } from 'vitest';
import {
  getHeaderVisibilityPolicy,
  isChromeHeaderVisible,
} from './headerVisibilityPolicy';

describe('header visibility policy', () => {
  it('hides chrome and editor header only when focus zen is active and header is asleep', () => {
    const hidden = getHeaderVisibilityPolicy({
      isFocusZen: true,
      isHeaderAwake: false,
    });

    expect(hidden.chromeVisible).toBe(false);
    expect(hidden.editorHeaderVisible).toBe(false);
    expect(
      isChromeHeaderVisible({ isFocusZen: true, isHeaderAwake: false }),
    ).toBe(false);
  });

  it('keeps chrome and editor header visible when focus zen header is awake', () => {
    const visible = getHeaderVisibilityPolicy({
      isFocusZen: true,
      isHeaderAwake: true,
    });

    expect(visible.chromeVisible).toBe(true);
    expect(visible.editorHeaderVisible).toBe(true);
  });

  it('keeps headers visible outside focus zen', () => {
    const visible = getHeaderVisibilityPolicy({
      isFocusZen: false,
      isHeaderAwake: false,
    });

    expect(visible.chromeVisible).toBe(true);
    expect(visible.editorHeaderVisible).toBe(true);
  });
});
