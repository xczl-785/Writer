import { describe, expect, it } from 'vitest';
import {
  filterSavableDirtyPaths,
  getCloseAction,
  getForceCloseHint,
} from './closeWorkflow';

describe('closeWorkflow', () => {
  it('chooses save_then_close when there are dirty files and no force-close request', () => {
    expect(getCloseAction({ hasDirty: true, forceCloseRequested: false })).toBe(
      'save_then_close',
    );
  });

  it('chooses close_now when there are no dirty files', () => {
    expect(
      getCloseAction({ hasDirty: false, forceCloseRequested: false }),
    ).toBe('close_now');
  });

  it('chooses close_now on second attempt after save failure', () => {
    expect(getCloseAction({ hasDirty: true, forceCloseRequested: true })).toBe(
      'close_now',
    );
  });

  it('returns force-close hint after save failure', () => {
    expect(getForceCloseHint()).toContain('再次点击关闭');
  });

  it('returns empty savable paths when workspace is null', () => {
    expect(filterSavableDirtyPaths(['/tmp/a.md'], null)).toEqual([]);
  });

  it('keeps only paths inside current workspace', () => {
    expect(
      filterSavableDirtyPaths(
        ['/ws/a.md', '/ws/folder/b.md', '/other/c.md', 'untitle'],
        '/ws',
      ),
    ).toEqual(['/ws/a.md', '/ws/folder/b.md']);
  });
});
