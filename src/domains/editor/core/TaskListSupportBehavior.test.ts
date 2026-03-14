import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Task list editor support', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  // TaskList and TaskItem extensions are registered in MarkdownService
  const markdownServiceTs = readFileSync(
    join(currentDir, '../../../services/markdown/MarkdownService.ts'),
    'utf-8',
  );

  it('registers task list extensions in the editor runtime', () => {
    expect(markdownServiceTs).toContain('@tiptap/extension-list');
    expect(markdownServiceTs).toContain('TaskList');
    expect(markdownServiceTs).toContain('TaskItem');
    expect(markdownServiceTs).toContain('TaskItem.configure({ nested: true })');
  });
});
