import { useEffect } from 'react';
import type { Editor } from '@tiptap/react';

export const shouldActivateTypewriterAnchor = ({
  enabled,
  contentHeight,
  viewportHeight,
}: {
  enabled: boolean;
  contentHeight: number;
  viewportHeight: number;
}) => enabled && contentHeight > viewportHeight;

export const computeTypewriterTargetScrollTop = ({
  currentScrollTop,
  containerTop,
  containerHeight,
  cursorTop,
  anchorRatio = 0.45,
}: {
  currentScrollTop: number;
  containerTop: number;
  containerHeight: number;
  cursorTop: number;
  anchorRatio?: number;
}) => {
  const anchorY = containerTop + containerHeight * anchorRatio;
  const delta = cursorTop - anchorY;
  return Math.max(0, Math.round(currentScrollTop + delta));
};

export const useTypewriterAnchor = ({
  editor,
  enabled,
}: {
  editor: Editor | null;
  enabled: boolean;
}) => {
  useEffect(() => {
    if (!editor || !enabled) return;

    const updateAnchor = () => {
      const editorDom = editor.view.dom as HTMLElement | null;
      const scrollContainer = editorDom?.closest('.editor-content-area') as
        | HTMLElement
        | null;
      if (!editorDom || !scrollContainer) {
        return;
      }

      if (
        !shouldActivateTypewriterAnchor({
          enabled,
          contentHeight: editorDom.scrollHeight,
          viewportHeight: scrollContainer.clientHeight,
        })
      ) {
        return;
      }

      const selectionPos = editor.state.selection.from;
      const coords = editor.view.coordsAtPos(selectionPos);
      const containerRect = scrollContainer.getBoundingClientRect();
      const targetScrollTop = computeTypewriterTargetScrollTop({
        currentScrollTop: scrollContainer.scrollTop,
        containerTop: containerRect.top,
        containerHeight: scrollContainer.clientHeight,
        cursorTop: coords.top,
      });

      if (Math.abs(targetScrollTop - scrollContainer.scrollTop) <= 1) {
        return;
      }
      scrollContainer.scrollTop = targetScrollTop;
    };

    editor.on('selectionUpdate', updateAnchor);
    editor.on('transaction', updateAnchor);

    return () => {
      editor.off('selectionUpdate', updateAnchor);
      editor.off('transaction', updateAnchor);
    };
  }, [editor, enabled]);
};

