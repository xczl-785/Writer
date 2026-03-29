import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Sidebar error notification wiring', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(join(currentDir, 'Sidebar.tsx'), 'utf-8');

  it('routes async sidebar file-operation failures through level2 notifications', () => {
    expect(source).toContain('const showLevel2SidebarError = useCallback(');
    expect(source).toContain("from '../../services/error/level2Notification'");
    expect(source).toContain("from './sidebarErrorCatalog'");
    expect(source).toContain('showLevel2Notification({');
    expect(source).toContain("getSidebarErrorMeta('copyPath')");
    expect(source).toContain("getSidebarErrorMeta('reveal')");
    expect(source).toContain("getSidebarErrorMeta('delete')");
    expect(source).toContain("getSidebarErrorMeta('move')");
    expect(source).toContain("getSidebarErrorMeta('create')");
    expect(source).toContain("getSidebarErrorMeta('rename')");
  });

  it('does not concatenate raw system error strings into sidebar-facing reasons', () => {
    expect(source).not.toContain('`Failed to create: ${message}`');
    expect(source).not.toContain("`${t('sidebar.deleteFailed')}: ${message}`");
    expect(source).not.toContain('`Failed to rename: ${message}`');
    expect(source).not.toContain("result.error || t('sidebar.moveFailed')");
  });
});
