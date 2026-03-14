import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Sidebar add-folder wiring', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const sidebarTsx = readFileSync(join(currentDir, 'Sidebar.tsx'), 'utf-8');
  const multiRootTsx = readFileSync(
    join(currentDir, 'MultiRootFileTree.tsx'),
    'utf-8',
  );

  it('routes add-folder-to-workspace entry points through the append flow', () => {
    expect(sidebarTsx).toContain('addFolderToWorkspaceByDialog');
    expect(sidebarTsx).toContain('void addFolderToWorkspaceByDialog();');
    expect(multiRootTsx).toContain('addFolderToWorkspaceByDialog');
    expect(multiRootTsx).toContain('void addFolderToWorkspaceByDialog();');
  });
});
