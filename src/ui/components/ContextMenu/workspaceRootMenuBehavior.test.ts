import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('workspace root context menu behavior', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(join(currentDir, 'workspaceRootMenu.tsx'), 'utf-8');

  it('only exposes workspace-root actions and no empty-area helper', () => {
    expect(source).toContain('export function getWorkspaceRootMenuItems');
    expect(source).not.toContain('export interface EmptyAreaMenuContext');
    expect(source).not.toContain('export function getEmptyAreaMenuItems');
  });
});
