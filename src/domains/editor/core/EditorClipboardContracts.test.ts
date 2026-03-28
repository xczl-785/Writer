import { describe, expect, it } from 'vitest';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

describe('Editor clipboard contracts', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const editorImplTsx = readFileSync(
    join(currentDir, 'EditorImpl.tsx'),
    'utf-8',
  );

  it('wires markdown clipboard parser and serializer into editorProps', () => {
    expect(editorImplTsx).toContain('clipboardTextParser');
    expect(editorImplTsx).toContain('clipboardTextSerializer');
    expect(editorImplTsx).toContain('createMarkdownClipboardTextParser');
    expect(editorImplTsx).toContain('createMarkdownClipboardTextSerializer');
  });
});
