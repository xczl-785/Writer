import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createViewportTierDebouncer,
  resolveViewportTier,
} from './useViewportTier';

describe('resolveViewportTier', () => {
  it('maps width to min/default/airy tiers', () => {
    expect(resolveViewportTier(640)).toBe('min');
    expect(resolveViewportTier(641)).toBe('default');
    expect(resolveViewportTier(1439)).toBe('default');
    expect(resolveViewportTier(1440)).toBe('airy');
  });
});

describe('createViewportTierDebouncer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('applies 200ms debounce on viewport tier updates', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 800,
    });
    const applied: string[] = [];
    const onResize = createViewportTierDebouncer((tier) => applied.push(tier));

    window.innerWidth = 500;
    onResize();
    vi.advanceTimersByTime(199);
    expect(applied).toEqual([]);

    vi.advanceTimersByTime(1);
    expect(applied).toEqual(['min']);
  });
});
