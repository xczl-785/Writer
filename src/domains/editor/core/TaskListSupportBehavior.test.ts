import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Task list editor support', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const markdownServiceTs = readFileSync(
    join(currentDir, '../../../services/markdown/MarkdownService.ts'),
    'utf-8',
  );
  const editorExtensionsTs = readFileSync(
    join(currentDir, 'editorExtensions.ts'),
    'utf-8',
  );
  const editorCss = readFileSync(join(currentDir, 'Editor.css'), 'utf-8');

  it('registers task list extensions in markdown parsing', () => {
    expect(markdownServiceTs).toContain('@tiptap/extension-list');
    expect(markdownServiceTs).toContain('TaskList');
    expect(markdownServiceTs).toContain('TaskItem');
    expect(markdownServiceTs).toContain('TaskItem.configure({ nested: true })');
  });

  it('registers task list extensions in the editor runtime', () => {
    expect(editorExtensionsTs).toContain('@tiptap/extension-list');
    expect(editorExtensionsTs).toContain('TaskList');
    expect(editorExtensionsTs).toContain(
      'TaskItem.configure({ nested: true })',
    );
  });

  it('applies dedicated task list styles in the editor runtime', () => {
    expect(editorCss).toContain("ul[data-type='taskList']");
    expect(editorCss).toContain("input[type='checkbox']");
    expect(editorCss).toContain('list-style: none');
  });
});
