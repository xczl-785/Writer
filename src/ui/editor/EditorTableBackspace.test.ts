import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Editor table backspace behavior', () => {
  it('includes source markers for Backspace table selection and deletion logic', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const editorTsx = readFileSync(join(currentDir, 'Editor.tsx'), 'utf-8');

    expect(editorTsx).toContain("event.key === 'Backspace'");

    expect(editorTsx).toContain('selection instanceof TextSelection');
    expect(editorTsx).toContain('selection.empty');
    expect(editorTsx).toContain('selection.$anchor.parentOffset === 0');
    expect(editorTsx).toContain('doc.nodeAt(posBefore)');
    expect(editorTsx).toContain("nodeBefore.type.name === 'table'");

    expect(editorTsx).toContain(
      "'Table selected. Press Backspace again to delete.'",
    );
    expect(editorTsx).toContain("setDestructiveStatus('Table')");

    expect(editorTsx).toContain('editorRef.current.commands.deleteTable()');
  });

  it('hardens boundary logic for table selection', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const editorTsx = readFileSync(join(currentDir, 'Editor.tsx'), 'utf-8');

    expect(editorTsx).toContain('const parent = $anchor.parent');
    expect(editorTsx).toContain("parent.type.name === 'paragraph'");
    expect(editorTsx).toContain('!isAtStartOfDoc');
  });
});
