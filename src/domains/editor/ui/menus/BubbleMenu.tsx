/**
 * Bubble menu component for TipTap editor
 *
 * A floating toolbar that appears when text is selected.
 */
import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { applyLinkAction } from '../linkActions';

const BUBBLE_MENU_DEBOUNCE_MS = 80;

export type BubbleMenuPosition = {
  open: boolean;
  x: number;
  y: number;
  placement: 'above' | 'below';
};

export function useBubbleMenu(editor: Editor | null) {
  const [position, setPosition] = useState<BubbleMenuPosition>({
    open: false,
    x: 0,
    y: 0,
    placement: 'above',
  });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!editor) return;

    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const updateBubble = () => {
      clearTimer();
      if (editor.state.selection.empty || !editor.isFocused) {
        setPosition({ open: false, x: 0, y: 0, placement: 'above' });
        return;
      }

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        setPosition({ open: false, x: 0, y: 0, placement: 'above' });
        return;
      }

      const rect = selection.getRangeAt(0).getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setPosition({ open: false, x: 0, y: 0, placement: 'above' });
        return;
      }

      timerRef.current = setTimeout(() => {
        const placeBelow = rect.top < 80;
        setPosition({
          open: true,
          x: rect.left + rect.width / 2,
          y: placeBelow ? rect.bottom + 8 : rect.top - 8,
          placement: placeBelow ? 'below' : 'above',
        });
      }, BUBBLE_MENU_DEBOUNCE_MS);
    };

    const hideBubble = () => {
      clearTimer();
      setPosition({ open: false, x: 0, y: 0, placement: 'above' });
    };

    editor.on('selectionUpdate', updateBubble);
    editor.on('focus', updateBubble);
    editor.on('blur', hideBubble);

    return () => {
      clearTimer();
      editor.off('selectionUpdate', updateBubble);
      editor.off('focus', updateBubble);
      editor.off('blur', hideBubble);
    };
  }, [editor]);

  return position;
}

export type BubbleMenuProps = {
  position: BubbleMenuPosition;
  editor: Editor | null;
  onShowStatus: (message: string) => void;
};

export function BubbleMenu({
  position,
  editor,
  onShowStatus,
}: BubbleMenuProps) {
  if (!editor) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <div
      className={`editor-bubble-menu ${position.open ? 'is-open' : ''} ${
        position.placement === 'below' ? 'is-below' : ''
      }`}
      style={{
        left: position.x,
        top: position.y,
      }}
    >
      <button
        type="button"
        className="editor-bubble-menu__button"
        onMouseDown={handleMouseDown}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        B
      </button>
      <button
        type="button"
        className="editor-bubble-menu__button"
        onMouseDown={handleMouseDown}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        I
      </button>
      <button
        type="button"
        className="editor-bubble-menu__button"
        onMouseDown={handleMouseDown}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        S
      </button>
      <button
        type="button"
        className="editor-bubble-menu__button"
        onMouseDown={handleMouseDown}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        {'</>'}
      </button>
      <button
        type="button"
        className="editor-bubble-menu__button"
        onMouseDown={handleMouseDown}
        onClick={() => {
          if (applyLinkAction(editor) === 'unavailable') {
            onShowStatus('Link unavailable');
          }
        }}
      >
        Link
      </button>
      <button
        type="button"
        className="editor-bubble-menu__button"
        onMouseDown={handleMouseDown}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
      >
        Highlight
      </button>
    </div>
  );
}
