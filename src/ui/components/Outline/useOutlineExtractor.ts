/**
 * Outline Extractor Hook
 *
 * Extracts heading structure from TipTap editor for outline navigation.
 *
 * @see docs/current/DEV/架构方案与技术风险评估.md - 4.2.3 大纲提取器
 */

import { useCallback, useEffect, useState } from 'react';
import type { Editor } from '@tiptap/react';

export interface OutlineItem {
  /** Unique identifier */
  id: string;
  /** Heading level (1-6) */
  level: 1 | 2 | 3 | 4 | 5 | 6;
  /** Heading text content */
  text: string;
  /** Position in document */
  position: number;
}

/**
 * Extract outline items from editor
 */
function extractOutline(editor: Editor): OutlineItem[] {
  const items: OutlineItem[] = [];
  const { doc } = editor.state;

  doc.descendants((node, pos) => {
    if (node.type.name === 'heading') {
      const level = node.attrs.level as 1 | 2 | 3 | 4 | 5 | 6;
      const text = node.textContent;

      if (text.trim()) {
        items.push({
          id: `heading-${pos}`,
          level,
          text: text.trim(),
          position: pos,
        });
      }
    }
  });

  return items;
}

/**
 * Hook to extract and track outline items from editor
 */
export function useOutlineExtractor(editor: Editor | null): {
  items: OutlineItem[];
  scrollToItem: (item: OutlineItem) => void;
} {
  const [items, setItems] = useState<OutlineItem[]>([]);

  // Extract outline on editor content change
  const updateOutline = useCallback(() => {
    if (editor) {
      const extracted = extractOutline(editor);
      setItems(extracted);
    }
  }, [editor]);

  useEffect(() => {
    if (!editor) {
      const timer = setTimeout(() => {
        setItems([]);
      }, 0);
      return () => clearTimeout(timer);
    }

    const initialTimer = setTimeout(() => {
      updateOutline();
    }, 0);
    editor.on('update', updateOutline);

    return () => {
      clearTimeout(initialTimer);
      editor.off('update', updateOutline);
    };
  }, [editor, updateOutline]);

  // Scroll to heading position
  const scrollToItem = useCallback(
    (item: OutlineItem) => {
      if (!editor) return;

      editor.chain().focus().setTextSelection(item.position).scrollIntoView().run();
    },
    [editor],
  );

  return { items, scrollToItem };
}
