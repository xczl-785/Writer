import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
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

    expect(
      existsSync(join(srcRoot, 'state', 'actions', 'workspaceActions.ts')),
    ).toBe(false);
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
    expect(
      existsSync(join(srcRoot, 'state', 'actions', 'fileActions.ts')),
    ).toBe(false);
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

  it('keeps domain internals and recent-item consumers off legacy facades', () => {
    const fsSafety = readFileSync(
      join(srcRoot, 'domains', 'file', 'services', 'FsSafety.ts'),
      'utf-8',
    );
    const domainFileTreeNode = readFileSync(
      join(srcRoot, 'domains', 'file', 'ui', 'FileTreeNode.tsx'),
      'utf-8',
    );
    const domainMultiRootTree = readFileSync(
      join(srcRoot, 'domains', 'file', 'ui', 'MultiRootFileTree.tsx'),
      'utf-8',
    );
    const workspaceActions = readFileSync(
      join(srcRoot, 'domains', 'workspace', 'services', 'workspaceActions.ts'),
      'utf-8',
    );
    const recentMenu = readFileSync(
      join(
        srcRoot,
        'ui',
        'components',
        'RecentWorkspaces',
        'RecentWorkspacesMenu.tsx',
      ),
      'utf-8',
    );
    const recentMenuTest = readFileSync(
      join(
        srcRoot,
        'ui',
        'components',
        'RecentWorkspaces',
        'RecentWorkspacesMenu.test.ts',
      ),
      'utf-8',
    );
    const emptyStateWorkspace = readFileSync(
      join(srcRoot, 'ui', 'workspace', 'EmptyStateWorkspace.tsx'),
      'utf-8',
    );
    const fileCommands = readFileSync(
      join(srcRoot, 'app', 'commands', 'fileCommands.ts'),
      'utf-8',
    );

    expect(fsSafety).toContain(
      "import { useEditorStore } from '../../editor/state/editorStore';",
    );
    expect(domainFileTreeNode).toContain(
      "import { useWorkspaceStore } from '../../workspace/state/workspaceStore';",
    );
    expect(domainMultiRootTree).toContain(
      "} from '../../workspace/state/workspaceStore';",
    );
    expect(domainMultiRootTree).toContain(
      "import { addFolderToWorkspaceByDialog } from '../../workspace/services/WorkspaceManager';",
    );
    expect(workspaceActions).toContain(
      "import { useEditorStore } from '../../editor/state/editorStore';",
    );
    expect(workspaceActions).toContain(
      "import { useFileTreeStore, type RootFolderNode } from '../../file/state/fileStore';",
    );
    expect(recentMenu).toContain(
      "} from '../../../domains/workspace/services/RecentItemsService';",
    );
    expect(recentMenuTest).toContain(
      "vi.mock('../../../domains/workspace/services/RecentItemsService'",
    );
    expect(recentMenuTest).toContain(
      "import { RecentItemsService } from '../../../domains/workspace/services/RecentItemsService';",
    );
    expect(emptyStateWorkspace).toContain(
      "import { type RecentItem } from '../../domains/workspace/services/RecentItemsService';",
    );
    expect(fileCommands).toContain(
      "import { RecentItemsService } from '../../domains/workspace/services/RecentItemsService';",
    );
  });

  it('drops the state action facade layer entirely', () => {
    expect(
      existsSync(join(srcRoot, 'state', 'actions', 'workspaceActions.ts')),
    ).toBe(false);
    expect(
      existsSync(join(srcRoot, 'state', 'actions', 'fileActions.ts')),
    ).toBe(false);
    expect(
      existsSync(join(srcRoot, 'state', 'actions', 'editorActions.ts')),
    ).toBe(false);
    expect(
      existsSync(join(srcRoot, 'state', 'actions', 'index.ts')),
    ).toBe(false);
  });
});
