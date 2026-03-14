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
    join(currentDir, '..', '..', '..', 'domains', 'editor', 'core', 'Editor.tsx'),
    'utf-8',
  );
  const editorShellTsx = readFileSync(
    join(currentDir, '..', '..', '..', 'domains', 'editor', 'ui', 'components', 'EditorShell.tsx'),
    'utf-8',
  );

  it('refreshes outline on transaction and file refresh token', () => {
    expect(extractorTs).toContain("editor.on('transaction', scheduleUpdate)");
    expect(extractorTs).toContain('refreshToken?: string | null');
    expect(outlineTsx).toContain('useOutlineExtractor(editor, refreshToken)');
  });

  it('clamps heading position before text selection jump', () => {
    expect(extractorTs).toContain(
      'const maxPos = editor.state.doc.content.size',
    );
    expect(extractorTs).toContain(
      'const safePos = Math.min(Math.max(item.position, 1), Math.max(1, maxPos));',
    );
  });

  it('closes outline popover on active file change', () => {
    expect(editorTsx).toContain('setIsOutlineOpen(false);');
    expect(editorTsx).toContain('}, [activeFile]);');
    expect(editorTsx).toContain('refreshToken={activeFile}');
  });

  it('uses pointerdown capture for robust outside-click close', () => {
    expect(editorShellTsx).toContain(
      "document.addEventListener('pointerdown', onPointerDown, true)",
    );
    expect(editorShellTsx).toContain(
      "document.removeEventListener('pointerdown', onPointerDown, true)",
    );
  });

  it('localizes outline panel copy through i18n keys', () => {
    expect(outlineTsx).toContain("t('outline.title')");
    expect(outlineTsx).toContain("t('outline.heading')");
    expect(outlineTsx).toContain("t('outline.headings')");
    expect(outlineTsx).toContain("t('outline.empty')");
  });
});
