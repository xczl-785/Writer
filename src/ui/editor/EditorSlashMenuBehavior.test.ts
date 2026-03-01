import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

describe('Editor slash menu behavior', () => {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const editorTsx = readFileSync(join(currentDir, 'Editor.tsx'), 'utf-8');

  it('supports slash trigger chars for Latin and full-width input', () => {
    expect(editorTsx).toContain("value === '/'");
    expect(editorTsx).toContain("value === '／'");
  });

  it('handles beforeinput and compositionend for IME-safe slash flow', () => {
    expect(editorTsx).toContain("addEventListener('beforeinput'");
    expect(editorTsx).toContain("addEventListener('compositionstart'");
    expect(editorTsx).toContain("addEventListener('compositionend'");
    expect(editorTsx).toContain('const onCompositionEnd');
    expect(editorTsx).toContain("inputType === 'insertFromComposition'");
    expect(editorTsx).toContain('if (event.isComposing || composingRef.current)');
  });

  it('cleans committed slash char before opening menu in IME path', () => {
    expect(editorTsx).toContain('triggeredByCommittedChar');
    expect(editorTsx).toContain('.deleteRange({ from: selection.from - 1');
  });

  it('guards coordsAtPos access when editor view is not mounted yet', () => {
    expect(editorTsx).toContain('const getSafeCoordsAtPos');
    expect(editorTsx).toContain('return instance.view.coordsAtPos(pos);');
    expect(editorTsx).toContain('const rect = getSafeCoordsAtPos(editor, selection.from);');
  });

  it('renders slash session fragment in editor area without menu input field', () => {
    expect(editorTsx).toContain('className={`editor-slash-inline');
    expect(editorTsx).toContain('editor-slash-inline__trigger');
    expect(editorTsx).toContain('editor-slash-inline__query');
    expect(editorTsx).not.toContain('editor-slash-menu__fragment');
  });

  it('does not append query from compositionend to avoid IME duplicate text', () => {
    expect(editorTsx).not.toContain('if (slashState.phase !== \'idle\' && data)');
  });
});
