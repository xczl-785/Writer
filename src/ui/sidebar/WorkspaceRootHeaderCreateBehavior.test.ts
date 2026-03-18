import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('WorkspaceRootHeader create behavior markers', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const headerSource = readFileSync(
    join(currentDir, 'WorkspaceRootHeader.tsx'),
    'utf-8',
  );
  const sidebarSource = readFileSync(join(currentDir, 'Sidebar.tsx'), 'utf-8');

  it('wires root create callbacks into the workspace root menu', () => {
    expect(headerSource).toContain('onNewFile?: () => void;');
    expect(headerSource).toContain('onNewFolder?: () => void;');
    expect(headerSource).toContain('onNewFile: onNewFile ?? (() => {})');
    expect(headerSource).toContain('onNewFolder: onNewFolder ?? (() => {})');
    expect(sidebarSource).toContain('onNewFile={() => {');
    expect(sidebarSource).toContain("type: 'file'");
    expect(sidebarSource).toContain('onNewFolder={() => {');
    expect(sidebarSource).toContain("type: 'directory'");
  });

  it('expands collapsed folders before showing create previews', () => {
    expect(sidebarSource).toContain('const expandNode = useFileTreeStore((state) => state.expandNode);');
    expect(sidebarSource).toContain('expandNode(rootFolder.workspacePath);');
    expect(sidebarSource).toContain('expandNode(node.path);');
  });
});
