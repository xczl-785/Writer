/**
 * Bubble menu component for TipTap editor
 *
 * A floating toolbar that appears:
 * - On text selection → format mode (bold, italic, etc.)
 * - When cursor is inside a link → link mode (open, edit, unlink)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { t } from '../../../../shared/i18n';

const BUBBLE_MENU_DEBOUNCE_MS = 80;

export type BubbleMenuMode = 'format' | 'link';

export type BubbleMenuPosition = {
  open: boolean;
  x: number;
  y: number;
  placement: 'above' | 'below';
  mode: BubbleMenuMode;
  linkHref: string;
};

const CLOSED: BubbleMenuPosition = {
  open: false,
  x: 0,
  y: 0,
  placement: 'above',
  mode: 'format',
  linkHref: '',
};

export function useBubbleMenu(editor: Editor | null) {
  const [position, setPosition] = useState<BubbleMenuPosition>(CLOSED);
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

      if (!editor.isFocused) {
        setPosition(CLOSED);
        return;
      }

      const { empty } = editor.state.selection;
      const isLinkActive = editor.isActive('link');

      // Link mode: cursor collapsed inside a link mark
      if (empty && isLinkActive) {
        const linkAttrs = editor.getAttributes('link');
        const href = String(linkAttrs.href ?? '');

        // Get the DOM position of the link element
        const { from } = editor.state.selection;
        const coords = editor.view.coordsAtPos(from);
        const placeBelow = coords.top < 80;

        timerRef.current = setTimeout(() => {
          setPosition({
            open: true,
            x: coords.left,
            y: placeBelow ? coords.bottom + 8 : coords.top - 8,
            placement: placeBelow ? 'below' : 'above',
            mode: 'link',
            linkHref: href,
          });
        }, BUBBLE_MENU_DEBOUNCE_MS);
        return;
      }

      // Format mode: text selected
      if (empty) {
        setPosition(CLOSED);
        return;
      }

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        setPosition(CLOSED);
        return;
      }

      const rect = selection.getRangeAt(0).getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setPosition(CLOSED);
        return;
      }

      timerRef.current = setTimeout(() => {
        const placeBelow = rect.top < 80;
        setPosition({
          open: true,
          x: rect.left + rect.width / 2,
          y: placeBelow ? rect.bottom + 8 : rect.top - 8,
          placement: placeBelow ? 'below' : 'above',
          mode: 'format',
          linkHref: '',
        });
      }, BUBBLE_MENU_DEBOUNCE_MS);
    };

    const hideBubble = () => {
      clearTimer();
      setPosition(CLOSED);
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
      {position.mode === 'link' ? (
        <LinkModeContent
          editor={editor}
          href={position.linkHref}
          onMouseDown={handleMouseDown}
          onShowStatus={onShowStatus}
        />
      ) : (
        <FormatModeContent editor={editor} onMouseDown={handleMouseDown} />
      )}
    </div>
  );
}

/* ── Format mode (existing behavior) ────────────────── */

function FormatModeContent({
  editor,
  onMouseDown,
}: {
  editor: Editor;
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  const applyLink = () => {
    const currentHref = String(editor.getAttributes('link').href ?? '');
    const nextHref = window.prompt('Enter URL:', currentHref);
    if (nextHref === null) return;

    const trimmed = nextHref.trim();
    const chain = editor.chain().focus().extendMarkRange('link');

    if (!trimmed) {
      if (editor.isActive('link')) chain.unsetLink().run();
      return;
    }

    const normalized =
      /^[a-z]+:\/\//i.test(trimmed) || trimmed.startsWith('mailto:')
        ? trimmed
        : `https://${trimmed}`;
    chain.setLink({ href: normalized }).run();
  };

  return (
    <>
      <button
        type="button"
        className="editor-bubble-menu__button"
        onMouseDown={onMouseDown}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        B
      </button>
      <button
        type="button"
        className="editor-bubble-menu__button"
        onMouseDown={onMouseDown}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        I
      </button>
      <button
        type="button"
        className="editor-bubble-menu__button"
        onMouseDown={onMouseDown}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        S
      </button>
      <button
        type="button"
        className="editor-bubble-menu__button"
        onMouseDown={onMouseDown}
        onClick={() => editor.chain().focus().toggleCode().run()}
      >
        {'</>'}
      </button>
      <button
        type="button"
        className="editor-bubble-menu__button"
        onMouseDown={onMouseDown}
        onClick={applyLink}
      >
        Link
      </button>
      <button
        type="button"
        className="editor-bubble-menu__button"
        onMouseDown={onMouseDown}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
      >
        Highlight
      </button>
    </>
  );
}

/* ── Link mode ───────────────────────────────────────── */

const MAX_HREF_DISPLAY = 40;

function truncateHref(href: string): string {
  if (href.length <= MAX_HREF_DISPLAY) return href;
  return href.slice(0, MAX_HREF_DISPLAY - 1) + '\u2026';
}

function LinkModeContent({
  editor,
  href,
  onMouseDown,
  onShowStatus,
}: {
  editor: Editor;
  href: string;
  onMouseDown: (e: React.MouseEvent) => void;
  onShowStatus: (message: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(href);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleOpen = useCallback(() => {
    if (!href) return;
    void openUrl(href).catch(() => {
      onShowStatus(t('editor.linkOpenFailed'));
    });
  }, [href, onShowStatus]);

  const handleStartEdit = useCallback(() => {
    setEditValue(href);
    setIsEditing(true);
    // Focus input on next tick after render
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [href]);

  const handleCommitEdit = useCallback(() => {
    const trimmed = editValue.trim();
    if (!trimmed) {
      // Empty → unlink
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      const normalized =
        /^[a-z]+:\/\//i.test(trimmed) || trimmed.startsWith('mailto:')
          ? trimmed
          : `https://${trimmed}`;
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: normalized })
        .run();
    }
    setIsEditing(false);
  }, [editor, editValue]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    editor.commands.focus();
  }, [editor]);

  const handleUnlink = useCallback(() => {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
  }, [editor]);

  if (isEditing) {
    return (
      <div className="editor-bubble-menu__link-edit" onMouseDown={onMouseDown}>
        <input
          ref={inputRef}
          type="text"
          className="editor-bubble-menu__link-input"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleCommitEdit();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              handleCancelEdit();
            }
          }}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder="https://..."
        />
        <button
          type="button"
          className="editor-bubble-menu__button"
          onClick={handleCommitEdit}
        >
          ✓
        </button>
        <button
          type="button"
          className="editor-bubble-menu__button"
          onClick={handleCancelEdit}
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="editor-bubble-menu__link-bar" onMouseDown={onMouseDown}>
      <span
        className="editor-bubble-menu__link-href"
        title={href}
        onClick={handleOpen}
      >
        {truncateHref(href)}
      </span>
      <span className="editor-bubble-menu__link-sep" />
      <button
        type="button"
        className="editor-bubble-menu__button"
        onClick={handleOpen}
        title={t('editor.linkOpen')}
      >
        ↗
      </button>
      <button
        type="button"
        className="editor-bubble-menu__button"
        onClick={handleStartEdit}
        title={t('editor.linkEdit')}
      >
        ✎
      </button>
      <button
        type="button"
        className="editor-bubble-menu__button"
        onClick={handleUnlink}
        title={t('editor.linkUnlink')}
      >
        ✕
      </button>
    </div>
  );
}
