/**
 * Scroll Domain Module
 *
 * Provides unified scroll coordination for editor components.
 */

export type {
  ScrollSource,
  ScrollBehavior,
  ScrollRequest,
  ScrollResult,
  ScrollContainerInfo,
} from './scrollTypes';

export {
  resolveEditorContentTopOffset,
  findScrollContainer,
  getScrollContainerInfo,
  setScrollTop,
  shouldSkipScrollAdjustment,
} from './scrollUtils';

export { createScrollCoordinator, type ScrollCoordinator } from './scrollCoordinator';