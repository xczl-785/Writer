import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Sidebar create command routing', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(join(currentDir, 'Sidebar.tsx'), 'utf-8');

  it('routes both new-file and new-folder sidebar commands through explorer commands', () => {
    expect(source).toContain(
      "const command = resolveCreateEntryExplorerCommand(detail?.id ?? '')",
    );
    expect(source).toContain('dispatchExplorerCommand(command, commandCtx)');
  });

  it('uses the same currentPath-based workspace predicate for empty-area create menu gating', () => {
    expect(source).toContain(
      'hasWorkspace: canCreateFromWorkspace(currentPath)',
    );
    expect(source).not.toContain('hasWorkspace: rootFolders.length > 0');
  });
});
