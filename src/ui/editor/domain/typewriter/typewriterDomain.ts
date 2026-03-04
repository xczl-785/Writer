export const DEFAULT_TYPEWRITER_ANCHOR_RATIO = 0.45;

export const shouldActivateTypewriterAnchor = ({
  enabled,
  contentHeight,
  viewportHeight,
}: {
  enabled: boolean;
  contentHeight: number;
  viewportHeight: number;
}) => enabled && contentHeight > viewportHeight;

export const computeTypewriterTargetScrollTop = ({
  currentScrollTop,
  containerTop,
  containerHeight,
  cursorTop,
  anchorRatio = DEFAULT_TYPEWRITER_ANCHOR_RATIO,
}: {
  currentScrollTop: number;
  containerTop: number;
  containerHeight: number;
  cursorTop: number;
  anchorRatio?: number;
}) => {
  const anchorY = containerTop + containerHeight * anchorRatio;
  const delta = cursorTop - anchorY;
  return Math.max(0, Math.round(currentScrollTop + delta));
};

