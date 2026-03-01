import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Editor table controls', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const readEditor = () =>
    readFileSync(join(currentDir, 'Editor.tsx'), 'utf-8');
  const readConstants = () =>
    readFileSync(join(currentDir, 'constants.ts'), 'utf-8');

  it('removes table operation commands from toolbar constants', () => {
    const constantsTs = readConstants();

    expect(constantsTs).not.toContain("'deleteTable'");
    expect(constantsTs).not.toContain("ariaLabel: 'Delete table'");
    expect(constantsTs).not.toContain("label: 'Del Tbl'");
    expect(constantsTs).not.toContain("'insertTable'");
    expect(constantsTs).not.toContain("ariaLabel: 'Insert table'");
  });

  it('uses unified destructive status messaging', () => {
    const editorTsx = readEditor();

    expect(editorTsx).toContain('const setDestructiveStatus =');

    expect(editorTsx).toContain('setTransientStatus(`${action} deleted`)');

    expect(editorTsx).toContain("if (id.startsWith('delete'))");
    expect(editorTsx).toContain(
      "setDestructiveStatus(cmd.ariaLabel.replace(/^Delete\\s+/i, ''))",
    );
  });

  it('enforces undo/redo command path consistency', () => {
    const editorTsx = readEditor();

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
