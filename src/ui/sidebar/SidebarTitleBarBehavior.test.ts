import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('sidebar title bar behavior', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const sidebarTsx = readFileSync(join(currentDir, 'Sidebar.tsx'), 'utf-8');

  it('keeps workspace actions in sidebar header but removes collapse handling', () => {
    expect(sidebarTsx).toContain("title={t('sidebar.newFile')}");
    expect(sidebarTsx).toContain("title={t('sidebar.newFolder')}");
    expect(sidebarTsx).not.toContain('handleCollapseButtonClick');
    expect(sidebarTsx).not.toContain('handleCollapseButtonDoubleClick');
    expect(sidebarTsx).not.toContain("t('sidebar.collapse')");
    expect(sidebarTsx).not.toContain('onToggleVisibility?.()');
    expect(sidebarTsx).not.toContain(
      'onDoubleClick={handleCollapseButtonDoubleClick}',
    );
  });
});
