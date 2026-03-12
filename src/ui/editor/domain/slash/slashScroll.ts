/**
 * Slash Menu Scroll Algorithm
 *
 * Pure functions for computing scroll position during keyboard navigation.
 * Implements "early scroll safety belt" to ensure selected item is always visible.
 */

// Scroll constants (aligned with spec)
export const SLASH_MENU_SCROLL_BUFFER = 20;
export const SLASH_MENU_ITEM_HEIGHT = 34;

export type ScrollComputeInput = {
  menuElement: HTMLElement;
  activeItemIndex: number;
  itemHeight?: number;
  buffer?: number;
};

/**
 * Compute the scroll top needed to keep active item visible
 *
 * Returns null if no scroll adjustment is needed
 */
export function computeKeyboardScrollTop(
  menuElement: HTMLElement,
  _activeItemIndex: number,
  _itemHeight: number = SLASH_MENU_ITEM_HEIGHT,
  buffer: number = SLASH_MENU_SCROLL_BUFFER,
): number | null {
  const activeItem = menuElement.querySelector<HTMLButtonElement>(
    '.editor-slash-menu__item.is-active',
  );

  if (!activeItem) return null;

  const itemTop = activeItem.offsetTop;
  const itemBottom = itemTop + activeItem.offsetHeight;
  const visibleTop = menuElement.scrollTop + buffer;
  const visibleBottom =
    menuElement.scrollTop + menuElement.clientHeight - buffer;

  // Item is above visible area - scroll up
  if (itemTop < visibleTop) {
    return Math.max(0, itemTop - buffer);
  }

  // Item is below visible area - scroll down
  if (itemBottom > visibleBottom) {
    return Math.max(0, itemBottom - menuElement.clientHeight + buffer);
  }

  // Item is already visible - no scroll needed
  return null;
}

/**
 * Check if scroll adjustment is needed for given index
 *
 * This is a pure calculation version that doesn't require DOM
 */
export function needsScrollAdjustment(
  scrollTop: number,
  clientHeight: number,
  itemTop: number,
  itemHeight: number,
  buffer: number = SLASH_MENU_SCROLL_BUFFER,
): { needed: boolean; newScrollTop: number } {
  const itemBottom = itemTop + itemHeight;
  const visibleTop = scrollTop + buffer;
  const visibleBottom = scrollTop + clientHeight - buffer;

  if (itemTop < visibleTop) {
    return { needed: true, newScrollTop: Math.max(0, itemTop - buffer) };
  }

  if (itemBottom > visibleBottom) {
    return {
      needed: true,
      newScrollTop: Math.max(0, itemBottom - clientHeight + buffer),
    };
  }

  return { needed: false, newScrollTop: scrollTop };
}
