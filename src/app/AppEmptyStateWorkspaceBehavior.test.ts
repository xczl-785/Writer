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
      'const { folders, activeFile, workspaceFile, isDirty } = useWorkspaceStore();',
    );
    expect(appTsx).toContain('const workspaceContext = getWorkspaceContext({');
    expect(appTsx).toContain("const hasWorkspace = workspaceContext !== 'none';");
    expect(appTsx).toContain('const hasOpenFile = activeFile !== null;');
    expect(appTsx).toContain("{workspaceContext === 'none' && !hasOpenFile ? (");
    expect(appTsx).toContain(") : workspaceContext === 'saved-empty' ? (");
    expect(appTsx).toContain('<EmptyStateWorkspace');
    expect(appTsx).toContain('onOpenFolder={handleOpenFolder}');
    expect(appTsx).toContain('onOpenWorkspace={handleOpenWorkspaceFile}');
    expect(appTsx).toContain('mode="saved-empty"');
  });
});
