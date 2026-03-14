export type EditorHandle = {
  insertDefaultTable: () => void;
};

export type EditorProps = {
  isTypewriterActive?: boolean;
  viewportTier?: 'min' | 'default' | 'airy';
  isFocusZen?: boolean;
  isHeaderAwake?: boolean;
  onSetFocusZen?: (enabled: boolean) => void;
};
