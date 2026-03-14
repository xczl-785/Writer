import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createEditorLayoutModel } from './EditorLayoutModel';
import { EDITOR_SPACING_SPEC } from './EditorSpacingSpec';

describe('EditorLayoutModel', () => {
  it('uses shared spacing spec constants as single source of truth', () => {
    expect(EDITOR_SPACING_SPEC.top.min).toBe(32);
    expect(EDITOR_SPACING_SPEC.top.default).toBe(64);
    expect(EDITOR_SPACING_SPEC.inline.min).toBe(16);
    expect(EDITOR_SPACING_SPEC.inline.default).toBe(32);
    expect(EDITOR_SPACING_SPEC.bottom.all).toBe('40vh');
    expect(EDITOR_SPACING_SPEC.maxContentWidth).toBe(850);
  });

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

  it('maps airy tier values to default spacing with wider viewport mode', () => {
    const model = createEditorLayoutModel('airy');
    expect(model.contentPaddingTop).toBe(64);
    expect(model.contentPaddingInline).toBe(32);
    expect(model.contentPaddingBottom).toBe('40vh');
    expect(model.maxContentWidth).toBe(850);
  });

  it('requires editor stylesheet to consume unified layout css variables', () => {
    const currentDir = dirname(fileURLToPath(import.meta.url));
    const css = readFileSync(join(currentDir, 'Editor.css'), 'utf-8');
    expect(css).toContain('var(--editor-content-max-width, 850px)');
    expect(css).toContain('var(--editor-content-padding-top, 64px)');
    expect(css).toContain('var(--editor-content-padding-inline, 32px)');
    expect(css).toContain('var(--editor-content-padding-bottom, 40vh)');
  });
});
