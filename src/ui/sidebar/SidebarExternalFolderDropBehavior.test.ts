import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Sidebar external folder-drop wiring', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(join(currentDir, 'Sidebar.tsx'), 'utf-8');

  it('classifies external drops and appends folders to the current workspace', () => {
    expect(source).toContain('classifyDroppedPaths(');
    expect(source).toContain('extractDroppedPaths(');
    expect(source).toContain('FsService.getPathKind');
    expect(source).toContain('await addFolderPathToWorkspace(path);');
    expect(source).toContain('await handleDropToEditor(classification.files[0], {');
    expect(source).toContain('isExternalDragOver = false');
    expect(source).toContain('DragDropHint');
    expect(source).toContain('<DragDropHint');
    expect(source).toContain('tone="sidebar"');
    expect(source).toContain("t('fileDrop.addToWorkspace')");
    expect(source).toContain("t('fileDrop.openFile')");
    expect(source).toContain("t('fileDrop.openWorkspace')");
    expect(source).not.toContain(
      '// Handle file drop logic here - future enhancement',
    );
  });
});
