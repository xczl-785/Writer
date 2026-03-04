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
    contentPaddingTop: isMin ? 32 : 64,
    contentPaddingBottom: '40vh',
    contentPaddingInline: isMin ? 16 : 32,
    maxContentWidth: 850,
    typewriterAnchorRatio: 0.45,
  };
}

