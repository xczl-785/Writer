import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Sidebar menu command workspace gating', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(join(currentDir, 'Sidebar.tsx'), 'utf-8');

  it('derives menu create availability from workspace path presence instead of file-tree hydration state', () => {
    expect(source).toContain('const commandCtx = {');
    expect(source).toContain(
      'hasWorkspace: canCreateFromWorkspace(currentPath)',
    );
    expect(source).not.toContain('hasWorkspace: rootFolders.length > 0');
  });
});
