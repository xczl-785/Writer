import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Editor list styles', () => {
  it('defines bullet list markers for unordered lists', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const css = readFileSync(join(currentDir, 'Editor.css'), 'utf-8');

    expect(css).toMatch(/\.ProseMirror ul[\s\S]*list-style-type:\s*disc/i);
  });
});

describe('Editor toolbar MVP', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const readEditor = () =>
    readFileSync(join(currentDir, 'Editor.tsx'), 'utf-8');
  const readConstants = () =>
    readFileSync(join(currentDir, 'constants.ts'), 'utf-8');

  it('keeps formatting command descriptors and accessible labels', () => {
    const constantsTs = readConstants();

    const expectedAriaLabels = [
      'Bold',
      'Italic',
      'Inline code',
      'Heading 1',
      'Heading 2',
      'Heading 3',
      'Bullet list',
      'Ordered list',
      'Blockquote',
      'Code block',
    ];

    for (const label of expectedAriaLabels) {
      expect(constantsTs).toContain(`ariaLabel: '${label}'`);
    }
  });

  it('registers keyboard shortcuts for the same toolbar commands', () => {
    const constantsTs = readConstants();

    const expectedShortcuts = [
      'Mod-b',
      'Mod-i',
      'Mod-e',
      'Mod-Alt-1',
      'Mod-Alt-2',
      'Mod-Alt-3',
      'Mod-Alt-b',
      'Mod-Alt-o',
      'Mod-Alt-q',
      'Mod-Alt-c',
    ];

    for (const shortcut of expectedShortcuts) {
      expect(constantsTs).toContain(`'${shortcut}'`);
    }
  });

  it('uses the default table insert shape from editor config', () => {
    const constantsTs = readConstants();

    expect(constantsTs).toContain('const DEFAULT_TABLE_INSERT = {');
    expect(constantsTs).toContain('rows: EDITOR_CONFIG.table.defaultRows');
    expect(constantsTs).toContain('cols: EDITOR_CONFIG.table.defaultCols');
    const editorTsx = readEditor();
    expect(editorTsx).toContain('insertTable(DEFAULT_TABLE_INSERT)');
  });

  it('defines layout styling hooks for header/slash/find panel', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const css = readFileSync(join(currentDir, 'Editor.css'), 'utf-8');

    expect(css).toMatch(/\.editor-header\s*\{/i);
    expect(css).toMatch(/\.editor-find-panel\s*\{/i);
    expect(css).toMatch(/\.editor-ghost-slash\s*\{/i);
    expect(css).toMatch(/\.editor-slash-menu\s*\{/i);
  });

  it('disables code block boundary indicator in editor composition', () => {
    const editorTsx = readEditor();
    expect(editorTsx).toContain(
      'BlockBoundaryExtension.configure({ showCodeBlock: false })',
    );
  });
});
