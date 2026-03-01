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
  const readHooks = () =>
    readFileSync(join(currentDir, 'hooks', 'useUndoRedo.ts'), 'utf-8');
  const readExtensions = () =>
    readFileSync(
      join(currentDir, 'extensions', 'findReplaceShortcuts.ts'),
      'utf-8',
    );

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
    const hooksTs = readHooks();

    expect(hooksTs).toContain('const undo = useCallback');
    expect(hooksTs).toContain('editor.chain().focus().undo().run()');
    expect(hooksTs).toContain('const redo = useCallback');
    expect(hooksTs).toContain('editor.chain().focus().redo().run()');

    const extensionsTs = readExtensions();
    expect(extensionsTs).toContain("'Mod-z': () =>");
    expect(extensionsTs).toContain("'Mod-y': () =>");
    expect(extensionsTs).toContain("'Mod-Shift-z': () =>");
  });
});
