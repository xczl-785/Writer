import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('WorkspaceManager behaviors', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(join(currentDir, 'WorkspaceManager.ts'), 'utf-8');

  it('opens saved workspaces through a file picker filtered to writer-workspace files', () => {
    expect(source).toContain('export const openWorkspaceFile = async (): Promise<void> => {');
    expect(source).toContain('directory: false');
    expect(source).toContain("extensions: ['writer-workspace']");
    expect(source).toContain('workspaceActions.loadWorkspaceFile(path)');
  });

  it('adds folders to the current workspace through a dedicated dialog flow', () => {
    expect(source).toContain(
      'export const addFolderToWorkspaceByDialog = async (): Promise<void> => {',
    );
    expect(source).toContain("useStatusStore.getState().setStatus('loading', 'Adding folder...');");
    expect(source).toContain('workspaceActions.addFolderToWorkspace(path)');
  });

  it('saves workspaces through a file save dialog and records them in recent items', () => {
    expect(source).toContain(
      'export const saveWorkspaceFileByDialog = async (): Promise<void> => {',
    );
    expect(source).toContain("extensions: ['writer-workspace']");
    expect(source).toContain('workspaceActions.saveWorkspaceFile(path)');
    expect(source).toContain('RecentItemsService.addWorkspace(');
  });

  it('reuses the existing workspace file when saving an already-saved workspace', () => {
    expect(source).toContain(
      'export const saveCurrentWorkspace = async (): Promise<void> => {',
    );
    expect(source).toContain('const existingPath = workspace.workspaceFile;');
    expect(source).toContain('await workspaceActions.saveWorkspaceFile(existingPath)');
  });
});
