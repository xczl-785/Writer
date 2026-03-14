import { EDITOR_SPACING_SPEC } from './EditorSpacingSpec';

export type EditorViewportTier = 'min' | 'default' | 'airy';

export type EditorLayoutModel = {
  viewportTier: EditorViewportTier;
  headerHeight: number;
  footerHeight: number;
  contentPaddingTop: number;
  contentPaddingBottom: string;
  contentPaddingInline: number;
  maxContentWidth: number;
  typewriterAnchorRatio: number;
};

export function createEditorLayoutModel(
  viewportTier: EditorViewportTier,
): EditorLayoutModel {
  const isMin = viewportTier === 'min';

  return {
    viewportTier,
    headerHeight: 48,
    footerHeight: 28,
    contentPaddingTop: isMin
      ? EDITOR_SPACING_SPEC.top.min
      : EDITOR_SPACING_SPEC.top.default,
    contentPaddingBottom: EDITOR_SPACING_SPEC.bottom.all,
    contentPaddingInline: isMin
      ? EDITOR_SPACING_SPEC.inline.min
      : EDITOR_SPACING_SPEC.inline.default,
    maxContentWidth: EDITOR_SPACING_SPEC.maxContentWidth,
    typewriterAnchorRatio: 0.45,
  };
}
