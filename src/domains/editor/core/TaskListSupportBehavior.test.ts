import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Task list editor support', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const legacyMarkdownServiceTs = readFileSync(
    join(currentDir, '../../../services/markdown/MarkdownService.ts'),
    'utf-8',
  );
  const coreMarkdownServiceTs = readFileSync(
    join(currentDir, '../../../core/editor/markdown/MarkdownService.ts'),
    'utf-8',
  );
  const legacyEditorExtensionsTs = readFileSync(
    join(currentDir, 'editorExtensions.ts'),
    'utf-8',
  );
  const coreEditorExtensionsTs = readFileSync(
    join(currentDir, '../../../core/editor/schema/editorExtensions.ts'),
    'utf-8',
  );
  const editorCss = readFileSync(join(currentDir, 'Editor.css'), 'utf-8');

  it('registers task list extensions in markdown parsing', () => {
    expect(coreMarkdownServiceTs).toContain('@tiptap/extension-list');
    expect(coreMarkdownServiceTs).toContain('TaskList');
    expect(coreMarkdownServiceTs).toContain('TaskItem');
    expect(coreMarkdownServiceTs).toContain(
      'TaskItem.configure({ nested: true })',
    );
  });

  it('registers task list extensions in the editor runtime', () => {
    expect(coreEditorExtensionsTs).toContain('@tiptap/extension-list');
    expect(coreEditorExtensionsTs).toContain('TaskList');
    expect(coreEditorExtensionsTs).toContain(
      'TaskItem.configure({ nested: true })',
    );
  });

  it('keeps legacy task list source paths as core re-exports', () => {
    expect(legacyMarkdownServiceTs).toContain(
      "export * from '../../core/editor/markdown/MarkdownService'",
    );
    expect(legacyEditorExtensionsTs).toContain(
      '../../../core/editor/schema/editorExtensions',
    );
    expect(legacyEditorExtensionsTs).toContain('ImageResolver.resolve');
  });

  it('applies dedicated task list styles in the editor runtime', () => {
    expect(editorCss).toContain("ul[data-type='taskList']");
    expect(editorCss).toContain("input[type='checkbox']");
    expect(editorCss).toContain('list-style: none');
  });
});
