import { useEffect } from 'react';
import type { Editor } from '@tiptap/react';
import {
  computeTypewriterTargetScrollTop,
  DEFAULT_TYPEWRITER_ANCHOR_RATIO,
  shouldActivateTypewriterAnchor,
} from '../domain';

export { computeTypewriterTargetScrollTop, shouldActivateTypewriterAnchor };

export const useTypewriterAnchor = ({
  editor,
  enabled,
  anchorRatio = DEFAULT_TYPEWRITER_ANCHOR_RATIO,
}: {
  editor: Editor | null;
  enabled: boolean;
  anchorRatio?: number;
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
        anchorRatio,
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
  }, [editor, enabled, anchorRatio]);
};
