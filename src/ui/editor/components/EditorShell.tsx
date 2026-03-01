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
            ☰
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
