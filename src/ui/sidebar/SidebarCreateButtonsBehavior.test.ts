import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Sidebar create buttons workspace gating', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(join(currentDir, 'Sidebar.tsx'), 'utf-8');

  it('uses the same currentPath-based workspace predicate for create button disabled state', () => {
    expect(source).toContain('disabled={!canCreateFromWorkspace(currentPath)}');
  });
});
