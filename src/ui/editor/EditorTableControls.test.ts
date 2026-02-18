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
});
