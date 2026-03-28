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
    expect(source).toContain("level: 'level2'");
    expect(source).toContain("'sidebar-root-remove'");
    expect(source).toContain("'sidebar-root-reveal'");
    expect(source).toContain("'sidebar-root-copy-path'");
  });
});
