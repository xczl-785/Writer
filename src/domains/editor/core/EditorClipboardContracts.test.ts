import { describe, expect, it } from 'vitest';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

describe('Editor clipboard contracts', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const instanceControllerTs = readFileSync(
    join(currentDir, 'useEditorInstanceController.ts'),
    'utf-8',
  );

  it('wires the markdown clipboard parser and smart serializer into editorProps', () => {
    expect(instanceControllerTs).toContain('clipboardTextParser');
    expect(instanceControllerTs).toContain('clipboardTextSerializer');
    expect(instanceControllerTs).toContain('createMarkdownClipboardTextParser');
    expect(instanceControllerTs).toContain(
      'createSmartClipboardTextSerializer',
    );
  });

  it('wires the HTML clipboard serializer so text/html is a first-class channel', () => {
    // Capability markdown-clipboard CR-014: the DOMSerializer-backed
    // text/html channel must be explicitly attached so rich paste
    // targets (Word / Gmail / Notion / ...) receive styled markup.
    expect(instanceControllerTs).toContain('clipboardSerializer');
    expect(instanceControllerTs).toContain('DOMSerializer.fromSchema');
  });
});
