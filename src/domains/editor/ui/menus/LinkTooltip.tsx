/**
 * LinkTooltip — hover tooltip showing the destination URL of a link.
 *
 * Appears after a short delay when the mouse rests on an `<a.editor-link>`.
 * Disappears when the mouse leaves or on scroll.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';

const SHOW_DELAY_MS = 400;
const HIDE_DELAY_MS = 150;

export type LinkTooltipState = {
  open: boolean;
  href: string;
  x: number;
  y: number;
};

const CLOSED: LinkTooltipState = { open: false, href: '', x: 0, y: 0 };

export function useLinkTooltip(editor: Editor | null) {
  const [state, setState] = useState<LinkTooltipState>(CLOSED);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentAnchorRef = useRef<HTMLAnchorElement | null>(null);

  const clearTimers = useCallback(() => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const hide = useCallback(() => {
    clearTimers();
    currentAnchorRef.current = null;
    setState(CLOSED);
  }, [clearTimers]);

  useEffect(() => {
    if (!editor) return;
    const editorDom = editor.view.dom;

    const onMouseOver = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement)?.closest?.(
        'a.editor-link',
      ) as HTMLAnchorElement | null;

      if (!anchor) {
        // Mouse left a link — start hide delay
        if (currentAnchorRef.current) {
          clearTimers();
          hideTimerRef.current = setTimeout(hide, HIDE_DELAY_MS);
        }
        return;
      }

      // Same link — cancel pending hide
      if (anchor === currentAnchorRef.current) {
        if (hideTimerRef.current) {
          clearTimeout(hideTimerRef.current);
          hideTimerRef.current = null;
        }
        return;
      }

      // New link — schedule show
      clearTimers();
      currentAnchorRef.current = anchor;
      showTimerRef.current = setTimeout(() => {
        const rect = anchor.getBoundingClientRect();
        const href = anchor.getAttribute('href') ?? '';
        setState({
          open: true,
          href,
          x: rect.left + rect.width / 2,
          y: rect.bottom + 4,
        });
      }, SHOW_DELAY_MS);
    };

    const onMouseLeave = () => {
      clearTimers();
      hideTimerRef.current = setTimeout(hide, HIDE_DELAY_MS);
    };

    const onScroll = () => hide();

    editorDom.addEventListener('mouseover', onMouseOver);
    editorDom.addEventListener('mouseleave', onMouseLeave);

    // Hide on scroll (editor content area)
    const scrollContainer = editorDom.closest('.editor-content-area');
    scrollContainer?.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      clearTimers();
      editorDom.removeEventListener('mouseover', onMouseOver);
      editorDom.removeEventListener('mouseleave', onMouseLeave);
      scrollContainer?.removeEventListener('scroll', onScroll);
    };
  }, [editor, clearTimers, hide]);

  return state;
}

const MAX_DISPLAY_LENGTH = 60;

function truncateUrl(href: string): string {
  if (href.length <= MAX_DISPLAY_LENGTH) return href;
  return href.slice(0, MAX_DISPLAY_LENGTH - 1) + '\u2026';
}

export type LinkTooltipProps = {
  state: LinkTooltipState;
};

export function LinkTooltip({ state }: LinkTooltipProps) {
  if (!state.open) return null;

  return (
    <div
      className="editor-link-tooltip"
      style={{ left: state.x, top: state.y }}
    >
      {truncateUrl(state.href)}
    </div>
  );
}
