import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('BUG-01 Table Selection Sticking Mitigation (Config approach)', () => {
  it('verifies that allowTableNodeSelection is disabled to prevent mouse-driven node selection sticking', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const editorTsx = readFileSync(join(currentDir, 'Editor.tsx'), 'utf-8');

    // New mitigation: disable mouse-driven table node selection to reduce selection sticking
    expect(editorTsx).toContain('allowTableNodeSelection: false');
  });

  it('verifies that ineffective CSS pointer-events hacks are removed', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const editorCss = readFileSync(join(currentDir, 'Editor.css'), 'utf-8');

    // We only remove table-related pointer-events hacks.
    // Legitimate uses like placeholders should remain.
    expect(editorCss).not.toContain('.tableWrapper { pointer-events: none; }');
    expect(editorCss).not.toContain('table { pointer-events: none; }');
  });

  it('verifies that Backspace two-step table deletion logic is removed', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const editorTsx = readFileSync(join(currentDir, 'Editor.tsx'), 'utf-8');

    expect(editorTsx).not.toContain('selection instanceof NodeSelection');
    expect(editorTsx).not.toContain("selection.node.type.name === 'table'");
    expect(editorTsx).not.toContain('NodeSelection.create(');
    expect(editorTsx).not.toContain('editorRef.current.commands.deleteTable()');
    expect(editorTsx).not.toContain(
      "'Table selected. Press Backspace again to delete.'",
    );
  });
});
