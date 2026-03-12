const OVERLAY_SELECTOR =
  '.editor-find-panel, .editor-slash-menu, .editor-slash-inline, .context-menu, .outline-popover';

export function hasActiveOverlayInDom(
  eventTarget: EventTarget | null,
): boolean {
  const target = eventTarget instanceof Element ? eventTarget : null;
  const targetInsideOverlay = Boolean(target?.closest(OVERLAY_SELECTOR));
  if (targetInsideOverlay) {
    return true;
  }
  return Boolean(
    document.querySelector(
      '.editor-find-panel, .editor-slash-menu.is-open, .context-menu, .outline-popover',
    ),
  );
}
