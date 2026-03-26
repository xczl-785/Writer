import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Sidebar workspace root header integration', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const sidebarTsx = readFileSync(join(currentDir, 'Sidebar.tsx'), 'utf-8');

  it('renders workspace roots through WorkspaceRootHeader instead of inline labels', () => {
    expect(sidebarTsx).toContain(
      "import { WorkspaceRootHeader } from './WorkspaceRootHeader';",
    );
    expect(sidebarTsx).toContain('<WorkspaceRootHeader');
  });
});
