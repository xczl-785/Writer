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
import { computeOutlineWindow, findActiveOutlineIndex } from './outlineUtils';
import { t } from '../../../i18n';

export interface OutlineProps {
  /** TipTap editor instance */
  editor: Editor | null;
  /** Whether the panel is visible */
  isOpen: boolean;
  /** Force refresh token when file switches */
  refreshToken?: string | null;
  /** Callback when panel closes */
  onClose?: () => void;
}

/**
 * Outline Panel Component
 */
export const Outline: React.FC<OutlineProps> = ({
  editor,
  isOpen,
  refreshToken,
  onClose,
}) => {
  const { items, scrollToItem } = useOutlineExtractor(editor, refreshToken);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [scrollTop, setScrollTop] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Track active heading based on scroll position
  useEffect(() => {
    setActiveIndex(-1);
    setScrollTop(0);
  }, [refreshToken]);

  useEffect(() => {
    if (!editor || items.length === 0) return;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const updateActiveHeading = () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = setTimeout(() => {
        const { from } = editor.state.selection;
        setActiveIndex(findActiveOutlineIndex(items, from));
      }, 150);
    };

    updateActiveHeading();
    editor.on('selectionUpdate', updateActiveHeading);
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
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
    onClose?.();
  };

  if (!isOpen) return null;

  const rowHeight = 30;
  const overscan = 6;
  const maxVisible = 200;
  const isVirtualized = items.length > 500;
  const windowRange = computeOutlineWindow({
    total: items.length,
    scrollTop,
    rowHeight,
    overscan,
    maxVisible,
  });
  const visibleItems = isVirtualized
    ? items.slice(windowRange.start, windowRange.end)
    : items;
  const paddingTop = isVirtualized ? windowRange.start * rowHeight : 0;
  const paddingBottom = isVirtualized
    ? (items.length - windowRange.end) * rowHeight
    : 0;

  return (
    <div
      className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-[0_12px_40px_rgba(0,0,0,0.15)]"
      role="dialog"
      aria-label={t('outline.title')}
    >
      <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/50 px-4 py-3">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">
          {t('outline.title')}
        </h3>
        <span className="text-[10px] text-zinc-400">
          {items.length}{' '}
          {items.length === 1 ? t('outline.heading') : t('outline.headings')}
        </span>
      </div>

      <div
        ref={listRef}
        className="max-h-[28rem] overflow-y-auto p-2"
        onScroll={(event) => {
          if (!isVirtualized) {
            return;
          }
          setScrollTop(event.currentTarget.scrollTop);
        }}
      >
        {items.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-zinc-400">
            {t('outline.empty')}
          </div>
        ) : (
          <div style={{ paddingTop, paddingBottom }}>
            {visibleItems.map((item, index) => {
              const absoluteIndex = isVirtualized
                ? windowRange.start + index
                : index;
              return (
                <OutlineItemComponent
                  key={item.id}
                  item={item}
                  isActive={absoluteIndex === activeIndex}
                  onClick={() => handleClick(item)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
