/**
 * Scroll Utilities
 *
 * Pure utility functions for scroll operations.
 * Extracted from existing code without changing behavior.
 */

import type { ScrollContainerInfo } from './scrollTypes';

export const resolveEditorContentTopOffset = (element: HTMLElement): number => {
  const rawValue = getComputedStyle(element)
    .getPropertyValue('--editor-content-offset-top')
    .trim();
  const parsed = Number.parseFloat(rawValue);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.max(0, parsed);
};

export const findScrollContainer = (
  editorDom: HTMLElement,
): HTMLElement | null => {
  return editorDom.closest('.editor-content-area') as HTMLElement | null;
};

export const getScrollContainerInfo = (
  scrollContainer: HTMLElement,
): ScrollContainerInfo => {
  const offsetTop = resolveEditorContentTopOffset(scrollContainer);
  return {
    element: scrollContainer,
    scrollTop: scrollContainer.scrollTop,
    clientHeight: scrollContainer.clientHeight,
    scrollHeight: scrollContainer.scrollHeight,
    offsetTop,
  };
};

export const setScrollTop = (
  scrollContainer: HTMLElement,
  scrollTop: number,
): void => {
  scrollContainer.scrollTop = scrollTop;
};

export const shouldSkipScrollAdjustment = (
  targetScrollTop: number,
  currentScrollTop: number,
  minDeltaPx: number = 6,
): boolean => {
  return Math.abs(targetScrollTop - currentScrollTop) < minDeltaPx;
};
