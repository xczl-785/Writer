import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Sidebar create target wiring', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const sidebarSource = readFileSync(join(currentDir, 'Sidebar.tsx'), 'utf-8');
  const hookSource = readFileSync(
    join(currentDir, 'useCreateEntry.ts'),
    'utf-8',
  );

  it('delegates base-path resolution to useCreateEntry hook', () => {
    expect(sidebarSource).toContain('useCreateEntry(');
    expect(hookSource).toContain('resolveCreateGhostTarget({');
  });

  it('routes context-menu create actions through getCreateGhostTarget and beginCreateWithGhost', () => {
    expect(sidebarSource).toContain(
      "getCreateGhostTarget('file', rootPath, node.path, node.type)",
    );
    expect(sidebarSource).toContain(
      "getCreateGhostTarget('directory', rootPath, node.path, node.type)",
    );
    expect(sidebarSource).toContain('beginCreateWithGhost(');
  });

  it('renders root-level ghost rows inside the targeted root group instead of globally above all roots', () => {
    expect(sidebarSource).toContain('normalizePath(ghostNode.rootPath) ===');
    expect(sidebarSource).toContain('normalizePath(rootFolder.workspacePath)');
    expect(sidebarSource).toContain('ghostNode.parentPath === null ? (');
  });

  it('normalizes paths before matching ghost placement in root and nested directories', () => {
    expect(sidebarSource).toContain('normalizePath(ghostNode.rootPath) ===');
    expect(sidebarSource).toContain('normalizePath(rootFolder.workspacePath)');
    expect(sidebarSource).toContain(
      'normalizePath(ghostNode.parentPath) === normalizePath(node.path)',
    );
  });
});
