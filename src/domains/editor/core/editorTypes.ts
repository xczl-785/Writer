export type EditorHandle = {
  insertDefaultTable: () => void;
};

export type EditorProps = {
  isSidebarVisible?: boolean;
  onToggleSidebar?: () => void;
  isTypewriterActive?: boolean;
  viewportTier?: 'min' | 'default' | 'airy';
  isFocusZen?: boolean;
  isHeaderAwake?: boolean;
  onSetFocusZen?: (enabled: boolean) => void;
};
