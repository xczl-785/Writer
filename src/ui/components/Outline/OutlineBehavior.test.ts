import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Outline behavior', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const outlineTsx = readFileSync(join(currentDir, 'Outline.tsx'), 'utf-8');
  const extractorTs = readFileSync(
    join(currentDir, 'useOutlineExtractor.ts'),
    'utf-8',
  );
  const editorTsx = readFileSync(
    join(currentDir, '..', '..', 'editor', 'Editor.tsx'),
    'utf-8',
  );

  it('refreshes outline on transaction and file refresh token', () => {
    expect(extractorTs).toContain("editor.on('transaction', scheduleUpdate)");
    expect(extractorTs).toContain('refreshToken?: string | null');
    expect(outlineTsx).toContain('useOutlineExtractor(editor, refreshToken)');
  });

  it('clamps heading position before text selection jump', () => {
    expect(extractorTs).toContain('const maxPos = editor.state.doc.content.size');
    expect(extractorTs).toContain(
      'const safePos = Math.min(Math.max(item.position, 1), Math.max(1, maxPos));',
    );
  });

  it('closes outline popover on active file change', () => {
    expect(editorTsx).toContain('setIsOutlineOpen(false);');
    expect(editorTsx).toContain('}, [activeFile]);');
    expect(editorTsx).toContain('refreshToken={activeFile}');
  });
});
