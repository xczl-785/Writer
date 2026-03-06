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
export const SLASH_MENU_FLIP_SAFE_GAP = 48;
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

  // Calculate available space
  const availableBelow = viewportHeight - anchorRect.bottom;
  const availableAbove = anchorRect.top;

  // Default: position below anchor
  const defaultTop = anchorRect.bottom + SLASH_MENU_TRIGGER_GAP;

  // Flip-up conditions:
  // 1. Insufficient space below threshold
  // 2. Enough space above for menu + safe gap
  const shouldFlipUp =
    availableBelow < SLASH_MENU_FLIP_THRESHOLD &&
    availableAbove >= menuHeight + SLASH_MENU_FLIP_SAFE_GAP;

  // Calculate top position
  let top: number;
  if (shouldFlipUp) {
    // Position above anchor with safe gap
    top = anchorRect.top - menuHeight - SLASH_MENU_FLIP_SAFE_GAP;
  } else {
    top = defaultTop;
  }

  // Ensure top doesn't go above viewport
  top = Math.max(SLASH_MENU_EDGE_PADDING, top);

  // Low viewport protection
  if (viewportHeight < SLASH_MENU_FLIP_THRESHOLD) {
    return {
      left,
      top,
      maxHeight: '85vh',
      overflowY: 'auto',
    };
  }

  return { left, top };
}

/**
 * Compute inline indicator position
 */
export function computeSlashInlinePosition(
  anchorRect: { left: number; top: number },
): { x: number; y: number } {
  return {
    x: anchorRect.left + 4,
    y: anchorRect.top + 2,
  };
}