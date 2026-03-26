import { describe, expect, it } from 'vitest';
import {
  buildDefaultWorkspaceFileName,
  getWorkspaceIndicatorLabel,
  getWorkspaceFileBaseName,
} from './workspaceIndicator';

describe('workspace indicator naming', () => {
  it('uses folder name for a single-folder workspace', () => {
    expect(
      getWorkspaceIndicatorLabel({
        folders: [{ path: '/notes/temp', index: 0 }],
        workspaceFile: null,
        isDirty: false,
      }),
    ).toBe('temp');
  });

  it('uses workspace name for a saved single-folder workspace', () => {
    expect(
      getWorkspaceIndicatorLabel({
        folders: [{ path: '/notes/temp', index: 0 }],
        workspaceFile: '/Users/demo/project.writer-workspace',
        isDirty: false,
      }),
    ).toBe('project (工作区)');
  });

  it('uses untitled label for a multi-root workspace without a workspace file', () => {
    expect(
      getWorkspaceIndicatorLabel({
        folders: [
          { path: '/notes/temp', index: 0 },
          { path: '/notes/docs', index: 1 },
        ],
        workspaceFile: null,
        isDirty: true,
      }),
    ).toBe('未命名工作区 (未保存)');
  });

  it('uses the workspace file name for a saved multi-root workspace', () => {
    expect(
      getWorkspaceIndicatorLabel({
        folders: [
          { path: '/notes/temp', index: 0 },
          { path: '/notes/docs', index: 1 },
        ],
        workspaceFile: '/Users/demo/project.writer-workspace',
        isDirty: false,
      }),
    ).toBe('project (工作区)');
  });

  it('uses the workspace file name for an empty saved workspace', () => {
    expect(
      getWorkspaceIndicatorLabel({
        folders: [],
        workspaceFile: '/Users/demo/project.writer-workspace',
        isDirty: false,
      }),
    ).toBe('project (工作区)');
  });

  it('builds default workspace file names from current workspace state', () => {
    expect(
      buildDefaultWorkspaceFileName({
        folders: [{ path: '/notes/temp', index: 0 }],
        workspaceFile: null,
        isDirty: false,
      }),
    ).toBe('temp.writer-workspace');

    expect(
      buildDefaultWorkspaceFileName({
        folders: [
          { path: '/notes/temp', index: 0 },
          { path: '/notes/docs', index: 1 },
        ],
        workspaceFile: null,
        isDirty: true,
      }),
    ).toBe('未命名工作区.writer-workspace');
  });

  it('strips the workspace file suffix when deriving the base name', () => {
    expect(
      getWorkspaceFileBaseName('/Users/demo/project.writer-workspace'),
    ).toBe('project');
  });
});
