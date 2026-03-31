import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Sidebar error notification wiring', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const sidebarSource = readFileSync(join(currentDir, 'Sidebar.tsx'), 'utf-8');
  const hookSource = readFileSync(
    join(currentDir, 'useCreateEntry.ts'),
    'utf-8',
  );

  it('routes async sidebar file-operation failures through level2 notifications', () => {
    expect(sidebarSource).toContain(
      'const showLevel2SidebarError = useCallback(',
    );
    expect(sidebarSource).toContain(
      "from '../../services/error/level2Notification'",
    );
    expect(sidebarSource).toContain("from './sidebarErrorCatalog'");
    expect(sidebarSource).toContain('showLevel2Notification({');
    expect(sidebarSource).toContain("getSidebarErrorMeta('copyPath')");
    expect(sidebarSource).toContain("getSidebarErrorMeta('reveal')");
    expect(sidebarSource).toContain("getSidebarErrorMeta('delete')");
    expect(sidebarSource).toContain("getSidebarErrorMeta('move')");
    expect(sidebarSource).toContain("getSidebarErrorMeta('rename')");
  });

  it('routes create-entry failures through level2 notifications in useCreateEntry hook', () => {
    expect(hookSource).toContain("getSidebarErrorMeta('create')");
    expect(hookSource).toContain('showLevel2Notification({');
  });

  it('does not concatenate raw system error strings into sidebar-facing reasons', () => {
    expect(sidebarSource).not.toContain('`Failed to create: ${message}`');
    expect(sidebarSource).not.toContain(
      "`${t('sidebar.deleteFailed')}: ${message}`",
    );
    expect(sidebarSource).not.toContain('`Failed to rename: ${message}`');
    expect(sidebarSource).not.toContain(
      "result.error || t('sidebar.moveFailed')",
    );
  });
});
