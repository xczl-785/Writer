import { describe, expect, it } from 'vitest';

import {
  resolveCreateBasePath,
  resolveCreateGhostTarget,
} from './createEntryTarget';

describe('createEntryTarget', () => {
  it('uses selected directory as create base path', () => {
    const base = resolveCreateBasePath({
      currentPath: '/ws',
      selectedPath: '/ws/notes',
      selectedType: 'directory',
      activeFile: '/ws/a.md',
    });

    expect(base).toBe('/ws/notes');
  });

  it('uses selected file parent as create base path', () => {
    const base = resolveCreateBasePath({
      currentPath: '/ws',
      selectedPath: '/ws/notes/a.md',
      selectedType: 'file',
      activeFile: null,
    });

    expect(base).toBe('/ws/notes');
  });

  it('uses active file parent when no node is selected but an active file exists', () => {
    const base = resolveCreateBasePath({
      currentPath: '/ws',
      selectedPath: null,
      selectedType: null,
      activeFile: '/ws/drafts/a.md',
    });

    expect(base).toBe('/ws/drafts');
  });

  it('falls back to workspace root when nothing selected and no active file', () => {
    const base = resolveCreateBasePath({
      currentPath: '/ws',
      selectedPath: null,
      selectedType: null,
      activeFile: null,
    });

    expect(base).toBe('/ws');
  });

  it('treats a selected root path as the workspace root create target', () => {
    const base = resolveCreateBasePath({
      currentPath: '/ws-b',
      selectedPath: '/ws-b',
      selectedType: null,
      activeFile: '/ws-a/note.md',
    });

    expect(base).toBe('/ws-b');
  });

  it('builds a ghost target from the resolved base path', () => {
    expect(
      resolveCreateGhostTarget({
        type: 'directory',
        rootPath: '/ws',
        targetPath: '/ws/notes/a.md',
        targetType: 'file',
        activeFile: null,
      }),
    ).toEqual({
      parentPath: '/ws/notes',
      type: 'directory',
      rootPath: '/ws',
    });
  });

  it('maps a selected root-level file to a root-level ghost target', () => {
    expect(
      resolveCreateGhostTarget({
        type: 'file',
        rootPath: '/ws',
        targetPath: '/ws/a.md',
        targetType: 'file',
        activeFile: null,
      }),
    ).toEqual({
      parentPath: null,
      type: 'file',
      rootPath: '/ws',
    });
  });

  it('treats mixed path separators as the same root when resolving a root-level file target', () => {
    expect(
      resolveCreateGhostTarget({
        type: 'file',
        rootPath: 'E:\\workspace',
        targetPath: 'E:/workspace/a.md',
        targetType: 'file',
        activeFile: null,
      }),
    ).toEqual({
      parentPath: null,
      type: 'file',
      rootPath: 'E:\\workspace',
    });
  });
});
