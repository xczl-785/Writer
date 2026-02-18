import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Editor table controls', () => {
  it('includes source markers for delete-table command and label', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const editorTsx = readFileSync(join(currentDir, 'Editor.tsx'), 'utf-8');

    expect(editorTsx).toContain("'deleteTable'");
    expect(editorTsx).toContain("ariaLabel: 'Delete table'");
    expect(editorTsx).toContain("label: 'Del Tbl'");
  });

  it('uses unified destructive status messaging', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const editorTsx = readFileSync(join(currentDir, 'Editor.tsx'), 'utf-8');

    expect(editorTsx).toContain('const setDestructiveStatus =');

    expect(editorTsx).toContain('setTransientStatus(`${action} deleted`)');

    expect(editorTsx).toContain("if (id.startsWith('delete'))");
    expect(editorTsx).toContain(
      "setDestructiveStatus(cmd.ariaLabel.replace(/^Delete\\s+/i, ''))",
    );

    expect(editorTsx).toContain("setDestructiveStatus('Table')");
  });

  it('enforces undo/redo command path consistency', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const editorTsx = readFileSync(join(currentDir, 'Editor.tsx'), 'utf-8');

    expect(editorTsx).toContain('const undo = useCallback');
    expect(editorTsx).toContain('editor.chain().focus().undo().run()');
    expect(editorTsx).toContain('const redo = useCallback');
    expect(editorTsx).toContain('editor.chain().focus().redo().run()');

    expect(editorTsx).toContain("'Mod-z': () =>");
    expect(editorTsx).toContain('return undo(editorRef.current)');
    expect(editorTsx).toContain("'Mod-y': () =>");
    expect(editorTsx).toContain("'Mod-Shift-z': () =>");
    expect(editorTsx).toContain('return redo(editorRef.current)');
  });
});
