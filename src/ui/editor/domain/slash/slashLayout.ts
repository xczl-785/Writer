/**
 * Slash Menu Layout Algorithm
 *
 * Pure functions for computing slash menu position and layout.
 * Handles right-edge clamping, flip-up logic, and low viewport protection.
 */

import type { CSSProperties } from 'react';

// Layout constants (aligned with spec)
export const SLASH_MENU_WIDTH = 260;
export const SLASH_MENU_EDGE_PADDING = 10;
export const SLASH_MENU_FLIP_THRESHOLD = 500;
export const SLASH_MENU_FLIP_SAFE_GAP = 64;
export const SLASH_MENU_ITEM_HEIGHT = 34;
export const SLASH_MENU_GROUP_HEIGHT = 24;
export const SLASH_MENU_FRAME_HEIGHT = 8;
export const SLASH_MENU_TRIGGER_GAP = 8;

export type SlashMenuLayoutInput = {
  anchorRect: {
    left: number;
    top: number;
    bottom: number;
  };
  menuHeight: number;
  viewportWidth: number;
  viewportHeight: number;
};

export type SlashMenuLayout = {
  left: number;
  top: number;
  maxHeight?: string;
  overflowY?: CSSProperties['overflowY'];
};

/**
 * Estimate menu height based on command count
 */
export function estimateSlashMenuHeight(
  basicCount: number,
  advancedCount: number,
): number {
  const itemCount = basicCount + advancedCount;
  const groupCount = Number(basicCount > 0) + Number(advancedCount > 0);
  return (
    itemCount * SLASH_MENU_ITEM_HEIGHT +
    groupCount * SLASH_MENU_GROUP_HEIGHT +
    SLASH_MENU_FRAME_HEIGHT
  );
}

/**
 * Compute slash menu layout position
 *
 * Handles:
 * - Right edge clamping
 * - Flip-up when insufficient space below
 * - Low viewport protection with scroll
 */
export function computeSlashMenuLayout(
  input: SlashMenuLayoutInput,
): SlashMenuLayout {
  const { anchorRect, menuHeight, viewportWidth, viewportHeight } = input;

  // Right edge clamping
  const maxLeft = viewportWidth - SLASH_MENU_WIDTH - SLASH_MENU_EDGE_PADDING;
  const left = Math.max(
    SLASH_MENU_EDGE_PADDING,
    Math.min(anchorRect.left, maxLeft),
  );

  // Default: position below anchor
  const defaultTop = anchorRect.bottom + SLASH_MENU_TRIGGER_GAP;
  const spaceBelow = Math.max(
    0,
    viewportHeight - defaultTop - SLASH_MENU_EDGE_PADDING,
  );
  const spaceAbove = Math.max(
    0,
    anchorRect.top - SLASH_MENU_FLIP_SAFE_GAP - SLASH_MENU_EDGE_PADDING,
  );

  const fitsBelow = spaceBelow >= menuHeight;
  const fitsAbove = spaceAbove >= menuHeight;

  if (fitsBelow) {
    return { left, top: defaultTop };
  }

  if (fitsAbove) {
    return {
      left,
      top: Math.max(
        SLASH_MENU_EDGE_PADDING,
        anchorRect.top - menuHeight - SLASH_MENU_FLIP_SAFE_GAP,
      ),
    };
  }

  const placeAbove = spaceAbove > spaceBelow;
  const availableHeight = Math.max(
    0,
    Math.floor(placeAbove ? spaceAbove : spaceBelow),
  );
  const top = placeAbove
    ? Math.max(
        SLASH_MENU_EDGE_PADDING,
        anchorRect.top - availableHeight - SLASH_MENU_FLIP_SAFE_GAP,
      )
    : defaultTop;

  return {
    left,
    top,
    maxHeight: `${availableHeight}px`,
    overflowY: 'auto',
  };
}

/**
 * Compute inline indicator position
 */
export function computeSlashInlinePosition(anchorRect: {
  left: number;
  top: number;
}): { x: number; y: number } {
  return {
    x: anchorRect.left + 4,
    y: anchorRect.top + 2,
  };
}
