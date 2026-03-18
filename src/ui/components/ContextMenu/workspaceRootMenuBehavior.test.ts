import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('workspace root context menu behavior', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(join(currentDir, 'workspaceRootMenu.tsx'), 'utf-8');

  it('exposes create entries for workspace roots and no empty-area helper', () => {
    expect(source).toContain('export function getWorkspaceRootMenuItems');
    expect(source).toContain("id: 'new-file'");
    expect(source).toContain("id: 'new-folder'");
    expect(source).not.toContain('export interface EmptyAreaMenuContext');
    expect(source).not.toContain('export function getEmptyAreaMenuItems');
  });

  it('does not expose rename-display-name anymore', () => {
    expect(source).not.toContain("id: 'rename-display-name'");
    expect(source).not.toContain('workspace.renameDisplayName');
    expect(source).not.toContain('onRename');
  });
});
