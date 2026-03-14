import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('WorkspaceRootHeader behavior markers', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(
    join(currentDir, 'WorkspaceRootHeader.tsx'),
    'utf-8',
  );

  it('lets clicking the root folder row toggle expansion in addition to selection', () => {
    expect(source).toContain('const handleRowClick = useCallback(() => {');
    expect(source).toContain('onSelect?.();');
    expect(source).toContain('onToggle();');
    expect(source).toContain('onClick={handleRowClick}');
  });
});
