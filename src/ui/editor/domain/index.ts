export {
  collectFindTextMatches,
  getActiveFindMatchIndex,
  type FindTextMatch,
} from './findReplace/findReplaceDomain';
export {
  computeTypewriterTargetScrollTop,
  shouldActivateTypewriterAnchor,
  DEFAULT_TYPEWRITER_ANCHOR_RATIO,
} from './typewriter/typewriterDomain';
export { hasActiveOverlayInDom } from './focusZen/focusZenEscapeDomain';
export { isSlashTriggerChar, isInsertTextLikeInput } from './slash/slashDomain';
