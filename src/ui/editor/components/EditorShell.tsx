import { EditorContent, type Editor as TiptapEditor } from '@tiptap/react';
import { useEffect, useRef, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';

type Props = {
  editor: TiptapEditor;
  setHasEditorWidgetFocus: (focused: boolean) => void;
  onEditorContextMenu: (event: ReactMouseEvent) => void;
  bubbleMenu?: ReactNode;
  ghostHint?: ReactNode;
  slashMenu?: ReactNode;
  breadcrumb: ReactNode;
  findReplacePanel?: ReactNode;
  isOutlineOpen: boolean;
  onToggleOutline: () => void;
  onCloseOutline: () => void;
  outlinePopover?: ReactNode;
};

export function EditorShell({
  editor,
  setHasEditorWidgetFocus,
  onEditorContextMenu,
  bubbleMenu,
  ghostHint,
  slashMenu,
  breadcrumb,
  findReplacePanel,
  isOutlineOpen,
  onToggleOutline,
  onCloseOutline,
  outlinePopover,
}: Props) {
  const outlineAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOutlineOpen) return;

    const onPointerDown = (event: globalThis.MouseEvent) => {
      if (!outlineAreaRef.current?.contains(event.target as Node)) {
        onCloseOutline();
      }
    };

    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, [isOutlineOpen, onCloseOutline]);

  return (
    <div
      className="editor-container h-full w-full flex flex-col"
      onFocusCapture={() => setHasEditorWidgetFocus(true)}
      onBlurCapture={(event) => {
        const nextFocused = event.relatedTarget as Node | null;
        if (!nextFocused || !event.currentTarget.contains(nextFocused)) {
          setHasEditorWidgetFocus(false);
        }
      }}
    >
      <header className="editor-header">
        <div className="editor-header__breadcrumb">{breadcrumb}</div>
        <div className="editor-header__actions" ref={outlineAreaRef}>
          <button
            type="button"
            className="editor-header__outline-btn"
            aria-label="Toggle outline"
            title="Toggle Outline (Shift+Mod+O)"
            onClick={onToggleOutline}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </button>
          {outlinePopover}
        </div>
      </header>
      {findReplacePanel}
      {bubbleMenu}
      {ghostHint}
      {slashMenu}
      <EditorContent
        editor={editor}
        className="editor-content-area"
        onContextMenu={onEditorContextMenu}
      />
    </div>
  );
}
