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

  it('does not keep inline rename state for workspace root display names', () => {
    expect(source).not.toContain('isRenaming');
    expect(source).not.toContain('renameDraft');
    expect(source).not.toContain('handleRename');
    expect(source).not.toContain('commitRename');
    expect(source).not.toContain('cancelRename');
    expect(source).not.toContain('renameWorkspaceFolder');
    expect(source).not.toContain('InlineInput');
  });

  it('routes root-folder operation failures through level2 notifications', () => {
    // After the notification unification refactor, level2 routing is
    // encapsulated in showLevel2Notification / showLevel2SidebarError, and
    // error source strings live in sidebarErrorCatalog.
    // Verify the component uses the unified level2 helper and the catalog.
    expect(source).toContain('showLevel2SidebarError');
    expect(source).toContain('showLevel2Notification');
    expect(source).toContain("getSidebarErrorMeta('rootRemove')");
    expect(source).toContain("getSidebarErrorMeta('rootReveal')");
    expect(source).toContain("getSidebarErrorMeta('rootCopyPath')");
  });
});
