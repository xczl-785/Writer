import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Editor &nbsp; sanitization', () => {
  it('includes non-breaking space replacement in onUpdate serialization path', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const editorTsx = readFileSync(join(currentDir, 'Editor.tsx'), 'utf-8');

    // The onUpdate handler must sanitize \xA0 (non-breaking space) before
    // persisting Markdown, to prevent &nbsp; from leaking into saved files.
    expect(editorTsx).toContain("markdown.replace(/\\xA0/g, ' ')");
  });
});
