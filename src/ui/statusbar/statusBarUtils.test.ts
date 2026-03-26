import { describe, expect, it } from 'vitest';
import { countCharacters, deriveSyncState } from './statusBarUtils';

describe('statusBarUtils', () => {
  it('counts letters, numbers, CJK and symbols (excluding whitespace)', () => {
    expect(countCharacters('ab 12 中，。\n!')).toBe(8);
  });

  it('derives sync states from save status', () => {
    expect(deriveSyncState('saving')).toBe('syncing');
    expect(deriveSyncState('dirty')).toBe('dirty');
    expect(deriveSyncState('error')).toBe('dirty');
    expect(deriveSyncState('saved')).toBe('synced');
  });
});
