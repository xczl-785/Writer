import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('build warning regression', () => {
  const srcRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  const projectRoot = join(srcRoot, '..');

  it('keeps workspace persistence on static store imports', () => {
    const source = readFileSync(
      join(
        srcRoot,
        'domains',
        'workspace',
        'services',
        'WorkspaceStatePersistence.ts',
      ),
      'utf-8',
    );

    expect(source).toContain("useWorkspaceStore,");
    expect(source).not.toContain("await import('../state/workspaceStore')");
  });

  it('keeps vite chunk splitting configured for large vendor bundles', () => {
    const source = readFileSync(join(projectRoot, 'vite.config.ts'), 'utf-8');

    expect(source).toContain('manualChunks(id)');
    expect(source).toContain("return 'app-editor';");
    expect(source).toContain("return 'vendor-react';");
    expect(source).toContain("return 'vendor-tiptap';");
    expect(source).toContain("return 'vendor-tauri';");
    expect(source).toContain("return 'vendor-icons';");
  });

  it('keeps workspace actions on a single domain source', () => {
    const legacyActions = readFileSync(
      join(srcRoot, 'state', 'actions', 'workspaceActions.ts'),
      'utf-8',
    );
    const sidebar = readFileSync(
      join(srcRoot, 'ui', 'sidebar', 'Sidebar.tsx'),
      'utf-8',
    );
    const virtualizedTree = readFileSync(
      join(
        srcRoot,
        'ui',
        'components',
        'VirtualizedFileTree',
        'VirtualizedFileTree.tsx',
      ),
      'utf-8',
    );
    const domainFileTreeNode = readFileSync(
      join(srcRoot, 'domains', 'file', 'ui', 'FileTreeNode.tsx'),
      'utf-8',
    );

    expect(legacyActions.trim()).toBe(
      "export * from '../../domains/workspace/services/workspaceActions';",
    );
    expect(sidebar).toContain(
      "import { workspaceActions } from '../../domains/workspace/services/workspaceActions';",
    );
    expect(virtualizedTree).toContain(
      "import { workspaceActions } from '../../../domains/workspace/services/workspaceActions';",
    );
    expect(domainFileTreeNode).toContain(
      "import { workspaceActions } from '../../workspace/services/workspaceActions';",
    );
  });

  it('keeps file actions and fs/workspace entrypoints aligned to domains', () => {
    const legacyFileActions = readFileSync(
      join(srcRoot, 'state', 'actions', 'fileActions.ts'),
      'utf-8',
    );
    const domainFileActions = readFileSync(
      join(srcRoot, 'domains', 'file', 'services', 'fileActions.ts'),
      'utf-8',
    );
    const sidebar = readFileSync(
      join(srcRoot, 'ui', 'sidebar', 'Sidebar.tsx'),
      'utf-8',
    );
    const multiRootTree = readFileSync(
      join(srcRoot, 'ui', 'sidebar', 'MultiRootFileTree.tsx'),
      'utf-8',
    );
    const virtualizedTree = readFileSync(
      join(
        srcRoot,
        'ui',
        'components',
        'VirtualizedFileTree',
        'VirtualizedFileTree.tsx',
      ),
      'utf-8',
    );

    expect(domainFileActions).toContain('export const fileActions = {');
    expect(legacyFileActions.trim()).toBe(
      "export * from '../../domains/file/services/fileActions';",
    );
    expect(sidebar).toContain(
      "import { fileActions } from '../../domains/file/services/fileActions';",
    );
    expect(sidebar).toContain(
      "openWorkspace,",
    );
    expect(sidebar).toContain(
      "} from '../../domains/workspace/services/WorkspaceManager';",
    );
    expect(sidebar).toContain(
      "import { FsService } from '../../domains/file/services/FsService';",
    );
    expect(sidebar).toContain(
      "import { FsSafety } from '../../domains/file/services/FsSafety';",
    );
    expect(multiRootTree).toContain(
      "import { fileActions } from '../../domains/file/services/fileActions';",
    );
    expect(multiRootTree).toContain(
      "import { FsSafety } from '../../domains/file/services/FsSafety';",
    );
    expect(virtualizedTree).toContain(
      "import { fileActions } from '../../../domains/file/services/fileActions';",
    );
    expect(virtualizedTree).toContain(
      "import { FsSafety } from '../../../domains/file/services/FsSafety';",
    );
  });
});
