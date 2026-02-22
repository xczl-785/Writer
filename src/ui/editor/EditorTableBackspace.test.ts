import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Editor table backspace behavior', () => {
  it('includes source markers for Backspace table selection and deletion logic', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const editorTsx = readFileSync(join(currentDir, 'Editor.tsx'), 'utf-8');

    // Backspace key detection guard
    expect(editorTsx).toContain("event.key === 'Backspace'");

    // Case 1: NodeSelection-based table deletion
    expect(editorTsx).toContain('selection instanceof NodeSelection');
    expect(editorTsx).toContain("selection.node.type.name === 'table'");
    expect(editorTsx).toContain('editorRef.current.commands.deleteTable()');
    expect(editorTsx).toContain("setDestructiveStatus('Table')");

    // Case 2: TextSelection at start-of-block, preceding sibling is table
    expect(editorTsx).toContain('selection instanceof TextSelection');
    expect(editorTsx).toContain('selection.empty');
    expect(editorTsx).toContain('selection.$anchor.parentOffset === 0');

    // Uses $pos.nodeBefore instead of the old doc.nodeAt(pos - 1) approach
    expect(editorTsx).toContain('$beforeBlock.nodeBefore');
    expect(editorTsx).toContain("nodeBefore.type.name === 'table'");

    // Status feedback for two-step delete UX
    expect(editorTsx).toContain(
      "'Table selected. Press Backspace again to delete.'",
    );
  });

  it('hardens boundary logic for table selection using $pos.nodeBefore', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const editorTsx = readFileSync(join(currentDir, 'Editor.tsx'), 'utf-8');

    // Uses $anchor to resolve depth and start position, then resolves
    // the position before the block to get nodeBefore.
    expect(editorTsx).toContain('const $anchor = selection.$anchor');
    expect(editorTsx).toContain('const depth = $anchor.depth');
    expect(editorTsx).toContain('const parentStartPos = $anchor.start(depth)');
    expect(editorTsx).toContain('const beforeBlockPos = parentStartPos - 1');
    expect(editorTsx).toContain('doc.resolve(beforeBlockPos)');
    expect(editorTsx).toContain('const nodeBefore = $beforeBlock.nodeBefore');

    // Empty-paragraph detection for auto-cleanup
    expect(editorTsx).toContain('const parent = $anchor.parent');
    expect(editorTsx).toContain('const isParentEmpty =');
    expect(editorTsx).toContain('isParentEmpty');

    // Table position calculation for NodeSelection
    expect(editorTsx).toContain('beforeBlockPos - nodeBefore.nodeSize');

    // Handles both empty-paragraph (delete + select) and non-empty-paragraph
    // (select only) cases.
    expect(editorTsx).toContain('if (isParentEmpty)');
    expect(editorTsx).toContain('} else {');
    expect(editorTsx).toContain('NodeSelection.create(');
  });
});
