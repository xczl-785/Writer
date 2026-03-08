export const TYPEWRITER_FORCE_FREE_EVENT = 'writer:typewriter-force-free';

export type TypewriterForceFreeReason =
  | 'editor-click'
  | 'find-navigation'
  | 'outline-navigation'
  | 'programmatic-selection';

export const emitTypewriterForceFree = (
  reason: TypewriterForceFreeReason,
): void => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<{ reason: TypewriterForceFreeReason }>(
      TYPEWRITER_FORCE_FREE_EVENT,
      {
        detail: { reason },
      },
    ),
  );
};
