import { describe, expect, it } from 'vitest';
import {
  getWorkspaceContext,
  getWorkspaceType,
  type WorkspaceState,
} from './workspaceStore';

function buildWorkspaceState(
  partial: Partial<WorkspaceState>,
): WorkspaceState {
  return {
    folders: [],
    workspaceFile: null,
    isDirty: false,
    openFiles: [],
    activeFile: null,
    ...partial,
  };
}

describe('workspaceStore derived workspace context', () => {
  it('distinguishes empty saved workspace from no-workspace empty state', () => {
    expect(
      getWorkspaceContext(
        buildWorkspaceState({
          workspaceFile: '/tmp/project.writer-workspace',
          folders: [],
        }),
      ),
    ).toBe('saved-empty');

    expect(getWorkspaceContext(buildWorkspaceState({ folders: [] }))).toBe(
      'none',
    );
  });

  it('treats a single saved folder workspace differently from a temporary folder workspace', () => {
    expect(
      getWorkspaceContext(
        buildWorkspaceState({
          folders: [{ path: '/notes/project', index: 0 }],
        }),
      ),
    ).toBe('single-temporary');

    expect(
      getWorkspaceContext(
        buildWorkspaceState({
          workspaceFile: '/tmp/project.writer-workspace',
          folders: [{ path: '/notes/project', index: 0 }],
        }),
      ),
    ).toBe('saved');
  });

  it('preserves legacy workspace type buckets for empty, single, and multi', () => {
    expect(getWorkspaceType(buildWorkspaceState({ folders: [] }))).toBe('empty');
    expect(
      getWorkspaceType(
        buildWorkspaceState({
          folders: [{ path: '/notes/project', index: 0 }],
        }),
      ),
    ).toBe('single');
    expect(
      getWorkspaceType(
        buildWorkspaceState({
          folders: [
            { path: '/notes/project', index: 0 },
            { path: '/notes/docs', index: 1 },
          ],
        }),
      ),
    ).toBe('multi');
  });
});
