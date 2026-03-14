import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Editor table backspace behavior (Simplified)', () => {
  it('does not include custom two-step Backspace table selection/deletion logic', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const editorTsx = readFileSync(join(currentDir, 'Editor.tsx'), 'utf-8');

    expect(editorTsx).not.toContain('selection instanceof NodeSelection');
    expect(editorTsx).not.toContain("selection.node.type.name === 'table'");
    expect(editorTsx).not.toContain('NodeSelection.create(');
    expect(editorTsx).not.toContain('editorRef.current.commands.deleteTable()');
    expect(editorTsx).not.toContain("setDestructiveStatus('Table')");
    expect(editorTsx).not.toContain(
      "'Table selected. Press Backspace again to delete.'",
    );
  });

  it('clears CellSelection contents on Backspace/Delete without deleting the table node', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const editorTsx = readFileSync(join(currentDir, 'Editor.tsx'), 'utf-8');

    const keyDownStart = editorTsx.indexOf('handleKeyDown:');
    const keyDownEnd = editorTsx.indexOf('onUpdate:', keyDownStart);
    expect(keyDownStart).toBeGreaterThanOrEqual(0);
    expect(keyDownEnd).toBeGreaterThan(keyDownStart);
    const handleKeyDownSrc = editorTsx.slice(keyDownStart, keyDownEnd);

    expect(handleKeyDownSrc).toContain('instanceof CellSelection');
    expect(handleKeyDownSrc).toContain("event.key === 'Backspace'");
    expect(handleKeyDownSrc).toContain("event.key === 'Delete'");
    expect(handleKeyDownSrc).toContain('deleteCellSelection');
    expect(handleKeyDownSrc).not.toContain('deleteTable');
  });

  it('preserves the ArrowLeft boundary fix for navigating from below a table', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const editorTsx = readFileSync(join(currentDir, 'Editor.tsx'), 'utf-8');

    expect(editorTsx).toContain("event.key === 'ArrowLeft'");
    expect(editorTsx).toContain('TextSelection.near');
    expect(editorTsx).toContain("nodeBefore.type.name === 'table'");
  });
});
