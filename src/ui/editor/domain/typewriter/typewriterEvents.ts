export const TYPEWRITER_NON_INPUT_JUMP_EVENT =
  'writer:typewriter-non-input-jump';

export type TypewriterNonInputJumpSource =
  | 'find-replace'
  | 'outline'
  | 'programmatic-selection';

export type TypewriterNonInputJumpPayload = {
  source: TypewriterNonInputJumpSource;
};

export const emitTypewriterNonInputJump = (
  payload: TypewriterNonInputJumpPayload,
): void => {
  window.dispatchEvent(
    new CustomEvent<TypewriterNonInputJumpPayload>(
      TYPEWRITER_NON_INPUT_JUMP_EVENT,
      { detail: payload },
    ),
  );
};
