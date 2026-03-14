export type TriggerSource = 'input' | 'ime' | 'arrow' | 'mouse' | 'external';

export type TypewriterEventType =
  | 'before-input'
  | 'enter-keydown'
  | 'arrow-keydown'
  | 'composition-start'
  | 'composition-end'
  | 'mouse-caret-placed'
  | 'find-jump'
  | 'outline-jump'
  | 'programmatic-selection'
  | 'viewport-measured'
  | 'selection-changed'
  | 'force-free';

export type TypewriterMovementPayload = {
  previousCaretTop: number;
  nextCaretTop: number;
  thresholdY: number;
};

export type TypewriterEventEnvelope = {
  type: TypewriterEventType;
  timestamp: number;
  source: TriggerSource;
  payload?:
    | TypewriterMovementPayload
    | {
        isTypewriterActive: boolean;
      };
};

export const createTypewriterEventEnvelope = ({
  type,
  source,
  payload,
}: {
  type: TypewriterEventType;
  source: TriggerSource;
  payload?: TypewriterEventEnvelope['payload'];
}): TypewriterEventEnvelope => ({
  type,
  source,
  payload,
  timestamp: Date.now(),
});
