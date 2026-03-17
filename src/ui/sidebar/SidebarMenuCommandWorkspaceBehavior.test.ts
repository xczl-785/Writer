import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Sidebar menu command workspace gating', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(join(currentDir, 'Sidebar.tsx'), 'utf-8');
  const commandCtxSnippet =
    source.match(/const commandCtx = \{[\s\S]*?moveSelectionDown: moveRootFolderDown,\n  \};/)
      ?.[0] ?? '';

  it('derives menu create availability from workspace path presence instead of file-tree hydration state', () => {
    expect(commandCtxSnippet).toContain(
      'hasWorkspace: canCreateFromWorkspace(currentPath)',
    );
    expect(commandCtxSnippet).not.toContain(
      'hasWorkspace: rootFolders.length > 0',
    );
  });
});
