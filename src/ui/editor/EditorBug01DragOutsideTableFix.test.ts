import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('BUG-01 Table Selection Sticking Mitigation (Simplified)', () => {
  it('does not include the custom drag-selection correction extension', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const editorTsx = readFileSync(join(currentDir, 'Editor.tsx'), 'utf-8');

    expect(editorTsx).not.toContain(
      "name: 'editor-table-drag-outside-table-fix'",
    );
    expect(editorTsx).not.toContain('tableDragOutsideTableFixExtension');
    expect(editorTsx).not.toContain('getPosFromPointerEvent');
    expect(editorTsx).not.toContain("'.column-resize-handle'");
    expect(editorTsx).not.toContain("'.row-resize-handle'");
  });
});
