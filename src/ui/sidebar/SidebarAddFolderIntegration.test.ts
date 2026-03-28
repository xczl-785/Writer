import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Sidebar add-folder wiring', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const sidebarTsx = readFileSync(join(currentDir, 'Sidebar.tsx'), 'utf-8');

  it('removes add-folder and create actions from the empty-area sidebar surface', () => {
    expect(sidebarTsx).not.toContain('addFolderToWorkspaceByDialog');
    expect(sidebarTsx).not.toContain('getEmptyAreaMenuItems');
  });
});
