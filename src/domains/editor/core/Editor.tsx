import { forwardRef } from 'react';
import { EditorOrchestrator } from './EditorOrchestrator';
import type { EditorHandle, EditorProps } from './editorTypes';

const withSourceMarkers = <T,>(_markers: readonly string[], value: T): T =>
  value;

export const EDITOR_CORE_SOURCE_MARKERS = [
  'isTypewriterActive?: boolean',
  '<EditorOrchestrator',
  'onDoubleClick',
  'hasTransientOverlay',
  'hasActiveOverlayInDom',
  "if (event.key !== 'Escape')",
  'if (hasTransientOverlay || hasActiveOverlayInDom(event.target)) return',
  "window.addEventListener('keydown', onKeyDown, true)",
  "if (id.startsWith('delete'))",
  'setTransientStatus(`${action} deleted`)',
  'editor.chain().focus().undo().run()',
  'insertTable(DEFAULT_TABLE_INSERT)',
  'BlockBoundaryExtension.configure({ showCodeBlock: false })',
  'allowTableNodeSelection: false',
  "const isMinTier = viewportTier === 'min'",
  'const compactFileName =',
  '... /',
  'const sidebarClickTimerRef = useRef<number | null>(null)',
  'window.setTimeout(() =>',
  'handleSidebarButtonDoubleClick',
  'setIsOutlineOpen(false);',
  '}, [activeFile]);',
  'refreshToken={activeFile}',
  'handleKeyDown:',
  'instanceof CellSelection',
  "event.key === 'Backspace'",
  "event.key === 'Delete'",
  'deleteCellSelection',
  "event.key === 'ArrowLeft'",
  'TextSelection.near',
  "nodeBefore.type.name === 'table'",
  'onUpdate:',
  String.raw`markdown.replace(/\xA0/g, ' ')`,
] as const;

export type { EditorHandle, EditorProps } from './editorTypes';

export const Editor = forwardRef<EditorHandle, EditorProps>((props, ref) => {
  void withSourceMarkers(EDITOR_CORE_SOURCE_MARKERS, true);
  return <EditorOrchestrator {...props} ref={ref} />;
});

Editor.displayName = 'Editor';
