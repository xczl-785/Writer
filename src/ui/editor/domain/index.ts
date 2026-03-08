export {
  collectFindTextMatches,
  getActiveFindMatchIndex,
  type FindTextMatch,
} from './findReplace/findReplaceDomain';
export {
  computeTypewriterTargetScrollTop,
  shouldActivateTypewriterAnchor,
  DEFAULT_TYPEWRITER_ANCHOR_RATIO,
  DEFAULT_TYPEWRITER_ANCHOR_DEADBAND_PX,
  isWithinAnchorDeadband,
} from './typewriter/typewriterDomain';
export {
  type TypewriterMode,
  type TypewriterState,
  createInitialTypewriterState,
  createLockedTypewriterState,
  reduceTypewriterInputMovement,
  computeLockedTypewriterTargetScrollTop,
} from './typewriter/typewriterStateMachine';
export {
  type TriggerSource,
  type TypewriterEventType,
  type TypewriterEventEnvelope,
  createTypewriterEventEnvelope,
} from './typewriter/events';
export {
  reduceTypewriterState,
  dispatchTypewriterEvent,
} from './typewriter/reducers';
export {
  hasCrossedOrTouchedThreshold,
  shouldDowngradeLockedStateForExternalUpwardCompensation,
} from './typewriter/guards';
export {
  TYPEWRITER_FORCE_FREE_EVENT,
  type TypewriterForceFreeReason,
  emitTypewriterForceFree,
} from './typewriter/typewriterEvents';
export { hasActiveOverlayInDom } from './focusZen/focusZenEscapeDomain';
export { isSlashTriggerChar, isInsertTextLikeInput } from './slash/slashDomain';
export {
  type SlashPhase,
  type SlashSession,
  type SlashAction,
  type AnchorRect,
  createInitialSlashSession,
  slashReducer,
  isOpenPhase,
  isActivePhase,
} from './slash/slashSessionMachine';
export {
  SLASH_MENU_WIDTH,
  SLASH_MENU_EDGE_PADDING,
  SLASH_MENU_FLIP_THRESHOLD,
  SLASH_MENU_FLIP_SAFE_GAP,
  SLASH_MENU_ITEM_HEIGHT,
  SLASH_MENU_GROUP_HEIGHT,
  SLASH_MENU_FRAME_HEIGHT,
  SLASH_MENU_TRIGGER_GAP,
  type SlashMenuLayoutInput,
  type SlashMenuLayout,
  estimateSlashMenuHeight,
  computeSlashMenuLayout,
  computeSlashInlinePosition,
} from './slash/slashLayout';
export {
  SLASH_MENU_SCROLL_BUFFER,
  type ScrollComputeInput,
  computeKeyboardScrollTop,
  needsScrollAdjustment,
} from './slash/slashScroll';
export {
  type ScrollSource,
  type ScrollBehavior,
  type ScrollRequest,
  type ScrollResult,
  type ScrollContainerInfo,
  resolveEditorContentTopOffset,
  findScrollContainer,
  getScrollContainerInfo,
  setScrollTop,
  shouldSkipScrollAdjustment,
  createScrollCoordinator,
  type ScrollCoordinator,
} from './scroll';
