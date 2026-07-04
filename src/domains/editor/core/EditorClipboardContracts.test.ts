import { describe, expect, it } from 'vitest';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

describe('Editor clipboard contracts', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const sharedControllerTs = readFileSync(
    join(currentDir, 'useSingleDocumentEditorController.ts'),
    'utf-8',
  );

  it('wires the markdown clipboard parser and smart serializer into editorProps', () => {
    expect(sharedControllerTs).toContain('clipboardTextParser');
    expect(sharedControllerTs).toContain('clipboardTextSerializer');
    expect(sharedControllerTs).toContain('createMarkdownClipboardTextParser');
    expect(sharedControllerTs).toContain('createSmartClipboardTextSerializer');
  });

  it('wires the HTML clipboard serializer so text/html is a first-class channel', () => {
    // Capability markdown-clipboard CR-014: the DOMSerializer-backed
    // text/html channel must be explicitly attached so rich paste
    // targets (Word / Gmail / Notion / ...) receive styled markup.
    expect(sharedControllerTs).toContain('clipboardSerializer');
    expect(sharedControllerTs).toContain('DOMSerializer.fromSchema');
  });
});
