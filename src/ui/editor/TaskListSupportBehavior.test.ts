import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Task list editor support', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const editorImplTs = readFileSync(join(currentDir, 'EditorImpl.tsx'), 'utf-8');

  it('registers task list extensions in the editor runtime', () => {
    expect(editorImplTs).toContain('@tiptap/extension-list');
    expect(editorImplTs).toContain('TaskList');
    expect(editorImplTs).toContain('TaskItem');
    expect(editorImplTs).toContain('TaskItem.configure({ nested: true })');
  });
});
