import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEditorLayoutModel } from './EditorLayoutModel';

describe('EditorLayoutModel', () => {
  it('maps default tier values without changing current visual constants', () => {
    const model = createEditorLayoutModel('default');
    expect(model.contentPaddingTop).toBe(64);
    expect(model.contentPaddingInline).toBe(32);
    expect(model.contentPaddingBottom).toBe('40vh');
    expect(model.maxContentWidth).toBe(850);
    expect(model.typewriterAnchorRatio).toBe(0.45);
  });

  it('maps min tier values without changing current visual constants', () => {
    const model = createEditorLayoutModel('min');
    expect(model.contentPaddingTop).toBe(32);
    expect(model.contentPaddingInline).toBe(16);
    expect(model.contentPaddingBottom).toBe('40vh');
    expect(model.maxContentWidth).toBe(850);
    expect(model.typewriterAnchorRatio).toBe(0.45);
  });

  it('requires editor stylesheet to consume unified layout css variables', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const css = readFileSync(join(currentDir, '..', 'Editor.css'), 'utf-8');
    expect(css).toContain('var(--editor-content-max-width, 850px)');
    expect(css).toContain('var(--editor-content-padding-top, 64px)');
    expect(css).toContain('var(--editor-content-padding-inline, 32px)');
    expect(css).toContain('var(--editor-content-padding-bottom, 40vh)');
  });
});
