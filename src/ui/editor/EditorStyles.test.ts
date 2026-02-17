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
  it('renders formatting toolbar controls with accessible labels', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const editorTsx = readFileSync(join(currentDir, 'Editor.tsx'), 'utf-8');
    expect(editorTsx).toContain('aria-label={cmd.ariaLabel}');

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
      'Insert table',
      'Add row',
      'Delete row',
      'Add column',
      'Delete column',
    ];

    for (const label of expectedAriaLabels) {
      expect(editorTsx).toContain(`ariaLabel: '${label}'`);
    }
  });

  it('registers keyboard shortcuts for the same toolbar commands', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const editorTsx = readFileSync(join(currentDir, 'Editor.tsx'), 'utf-8');

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
      'Mod-t',
    ];

    for (const shortcut of expectedShortcuts) {
      expect(editorTsx).toContain(`'${shortcut}'`);
    }
  });

  it('uses the default table insert shape (3x3 with header row)', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const editorTsx = readFileSync(join(currentDir, 'Editor.tsx'), 'utf-8');

    expect(editorTsx).toContain(
      'insertTable({ rows: 3, cols: 3, withHeaderRow: true })',
    );
  });

  it('includes source markers for the insert-table popover inputs', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const editorTsx = readFileSync(join(currentDir, 'Editor.tsx'), 'utf-8');

    expect(editorTsx).toContain('insert-table-rows');
    expect(editorTsx).toContain('insert-table-cols');
    expect(editorTsx).toContain('aria-haspopup="dialog"');
  });

  it('defines minimal toolbar styling hooks', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const css = readFileSync(join(currentDir, 'Editor.css'), 'utf-8');

    expect(css).toMatch(/\.editor-toolbar\s*\{/i);
    expect(css).toMatch(/\.editor-toolbar__button\s*\{/i);
    expect(css).toMatch(/\.editor-toolbar__button\[disabled\]/i);
    expect(css).toMatch(/\.editor-toolbar__button\.is-active/i);
  });
});
