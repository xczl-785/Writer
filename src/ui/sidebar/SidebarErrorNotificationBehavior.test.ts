import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Sidebar error notification wiring', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(join(currentDir, 'Sidebar.tsx'), 'utf-8');

  it('routes async sidebar file-operation failures through level2 notifications', () => {
    expect(source).toContain('const showLevel2SidebarError = useCallback(');
    expect(source).toContain("level: 'level2'");
    expect(source).toContain("'sidebar-copy-path'");
    expect(source).toContain("'sidebar-reveal'");
    expect(source).toContain("'sidebar-delete'");
    expect(source).toContain("'sidebar-move'");
    expect(source).toContain("'sidebar-create'");
    expect(source).toContain("'sidebar-rename'");
  });

  it('does not concatenate raw system error strings into sidebar-facing reasons', () => {
    expect(source).not.toContain('`Failed to create: ${message}`');
    expect(source).not.toContain("`${t('sidebar.deleteFailed')}: ${message}`");
    expect(source).not.toContain('`Failed to rename: ${message}`');
    expect(source).not.toContain("result.error || t('sidebar.moveFailed')");
  });
});
