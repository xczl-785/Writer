import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('App empty workspace integration', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const appTsx = readFileSync(join(currentDir, 'App.tsx'), 'utf-8');

  it('routes empty workspace rendering through EmptyStateWorkspace in the app shell', () => {
    expect(appTsx).toContain(
      "import { EmptyStateWorkspace } from '../ui/workspace/EmptyStateWorkspace';",
    );
    expect(appTsx).toContain(
      'const { folders, activeFile } = useWorkspaceStore();',
    );
    expect(appTsx).toContain('const hasWorkspace = folders.length > 0;');
    expect(appTsx).toContain('const hasOpenFile = activeFile !== null;');
    expect(appTsx).toContain('{!hasWorkspace && !hasOpenFile ? (');
    expect(appTsx).toContain('<EmptyStateWorkspace');
    expect(appTsx).toContain('onOpenFolder={handleOpenFolder}');
    expect(appTsx).toContain('onOpenWorkspace={handleOpenWorkspaceFile}');
  });
});
