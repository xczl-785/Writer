import { describe, expect, it } from 'vitest';
import type { GitSyncStatus } from '../../services/fs/FsService';
import { countCharacters, deriveSyncState } from './statusBarUtils';

const gitBase: GitSyncStatus = {
  isRepo: true,
  hasRemote: true,
  dirty: false,
  ahead: 0,
  behind: 0,
};

describe('statusBarUtils', () => {
  it('counts letters, numbers, CJK and symbols (excluding whitespace)', () => {
    expect(countCharacters('ab 12 中，。\n!')).toBe(8);
  });

  it('derives sync states with clear priority', () => {
    expect(deriveSyncState('saved', null)).toBe('no-git');
    expect(deriveSyncState('saved', { ...gitBase, hasRemote: false })).toBe(
      'local-only',
    );
    expect(deriveSyncState('dirty', { ...gitBase, hasRemote: false })).toBe(
      'dirty',
    );
    expect(deriveSyncState('saving', gitBase)).toBe('syncing');
    expect(deriveSyncState('saved', { ...gitBase, dirty: true })).toBe('dirty');
    expect(deriveSyncState('saved', { ...gitBase, ahead: 2 })).toBe('ahead');
    expect(deriveSyncState('saved', { ...gitBase, behind: 3 })).toBe('behind');
    expect(deriveSyncState('saved', { ...gitBase, ahead: 1, behind: 1 })).toBe(
      'diverged',
    );
    expect(deriveSyncState('saved', gitBase)).toBe('synced');
  });
});
