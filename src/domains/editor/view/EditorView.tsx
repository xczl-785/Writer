import type { MouseEvent as ReactMouseEvent, ReactNode } from 'react';
import type { Editor as TiptapEditor } from '@tiptap/react';
import { EditorShell } from '../ui/components/EditorShell';

type EditorViewProps = {
  editor: TiptapEditor;
  setHasEditorWidgetFocus: (focused: boolean) => void;
  onEditorContextMenu: (event: ReactMouseEvent) => void;
  bubbleMenu?: ReactNode;
  ghostHint?: ReactNode;
  linkTooltip?: ReactNode;
  slashMenu?: ReactNode;
  breadcrumb: ReactNode;
  findReplacePanel?: ReactNode;
  isOutlineOpen: boolean;
  onToggleOutline: () => void;
  onCloseOutline: () => void;
  outlinePopover?: ReactNode;
  isFocusZen?: boolean;
  isHeaderAwake?: boolean;
};

/**
 * Transitional view boundary for editor refactor phases.
 */
export function EditorView(props: EditorViewProps) {
  return <EditorShell {...props} />;
}
