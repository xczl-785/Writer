export const DEFAULT_TYPEWRITER_ANCHOR_RATIO = 0.45;
export const DEFAULT_TYPEWRITER_ANCHOR_DEADBAND_PX = 12;

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
  deadbandPx = DEFAULT_TYPEWRITER_ANCHOR_DEADBAND_PX,
}: {
  currentScrollTop: number;
  containerTop: number;
  containerHeight: number;
  cursorTop: number;
  anchorRatio?: number;
  deadbandPx?: number;
}) => {
  const anchorY = containerTop + containerHeight * anchorRatio;
  if (isWithinAnchorDeadband(cursorTop, anchorY, deadbandPx)) {
    return currentScrollTop;
  }
  const delta = cursorTop - anchorY;
  return Math.max(0, Math.round(currentScrollTop + delta));
};

export const isWithinAnchorDeadband = (
  cursorY: number,
  anchorY: number,
  deadbandPx = DEFAULT_TYPEWRITER_ANCHOR_DEADBAND_PX,
) => Math.abs(cursorY - anchorY) <= deadbandPx;
