/**
 * Outline Panel Component
 *
 * Displays document outline for quick navigation.
 *
 * @see docs/current/PM/V5 功能清单.md - INT-015: 大纲导航面板
 * @see docs/current/UI/UI_UX规范.md - V5 新增层：抽屉式大纲
 */

import React, { useState, useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { useOutlineExtractor, type OutlineItem } from './useOutlineExtractor';
import { OutlineItemComponent } from './OutlineItem';

export interface OutlineProps {
  /** TipTap editor instance */
  editor: Editor | null;
  /** Whether the panel is visible */
  isOpen: boolean;
  /** Callback when panel closes */
  onClose?: () => void;
}

/**
 * Outline Panel Component
 */
export const Outline: React.FC<OutlineProps> = ({
  editor,
  isOpen,
  onClose,
}) => {
  const { items, scrollToItem } = useOutlineExtractor(editor);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);

  // Track active heading based on scroll position
  useEffect(() => {
    if (!editor || items.length === 0) return;

    const updateActiveHeading = () => {
      const { from } = editor.state.selection;

      // Find the heading that contains the current cursor position
      let activeFound = -1;
      for (let i = items.length - 1; i >= 0; i--) {
        if (items[i].position <= from) {
          activeFound = i;
          break;
        }
      }
      setActiveIndex(activeFound);
    };

    editor.on('selectionUpdate', updateActiveHeading);
    return () => {
      editor.off('selectionUpdate', updateActiveHeading);
    };
  }, [editor, items]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleClick = (item: OutlineItem) => {
    scrollToItem(item);
  };

  if (!isOpen) return null;

  return (
    <div
      className="w-56 h-full bg-zinc-50 dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden transition-all duration-150 ease-out"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 dark:border-zinc-800">
        <h3 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          Outline
        </h3>
        <span className="text-xs text-zinc-400 dark:text-zinc-500">
          {items.length} {items.length === 1 ? 'heading' : 'headings'}
        </span>
      </div>

      {/* Outline List */}
      <div ref={listRef} className="flex-1 overflow-y-auto py-1">
        {items.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-zinc-400 dark:text-zinc-500">
            No headings in document
          </div>
        ) : (
          items.map((item, index) => (
            <OutlineItemComponent
              key={item.id}
              item={item}
              isActive={index === activeIndex}
              onClick={() => handleClick(item)}
            />
          ))
        )}
      </div>
    </div>
  );
};
