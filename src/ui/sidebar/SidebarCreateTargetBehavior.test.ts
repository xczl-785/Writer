import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Sidebar create target wiring', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(join(currentDir, 'Sidebar.tsx'), 'utf-8');

  it('routes context-menu create actions through the same base-path resolver used by keyboard and toolbar create', () => {
    expect(source).toContain('resolveCreateGhostTarget({');
    expect(source).toContain("type: 'file'");
    expect(source).toContain("type: 'directory'");
    expect(source).toContain("getCreateGhostTarget('file', rootPath, node.path, node.type)");
    expect(source).toContain("getCreateGhostTarget('directory', rootPath, node.path, node.type)");
    expect(source).toContain('beginCreateWithGhost(');
  });

  it('renders root-level ghost rows inside the targeted root group instead of globally above all roots', () => {
    expect(source).toContain('ghostNode.rootPath === rootFolder.workspacePath');
    expect(source).toContain('ghostNode.parentPath === null ? (');
    expect(source).not.toContain('/* V6: 顶层 ghost 节点（根级别创建） */');
  });
});
