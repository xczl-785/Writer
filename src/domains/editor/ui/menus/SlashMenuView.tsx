/**
 * Slash Menu View Component
 *
 * Pure rendering component for slash menu.
 * Receives state and callbacks, contains no business logic.
 */

import { useLayoutEffect, useRef } from 'react';
import { t } from '../../../../shared/i18n';
import type { SlashCommand } from './useSlashMenu';
import {
  SLASH_MENU_ITEM_HEIGHT,
  SLASH_MENU_GROUP_HEIGHT,
  SLASH_MENU_FRAME_HEIGHT,
  computeSlashMenuLayout,
  computeKeyboardScrollTop,
} from '../../domain';

export type SlashMenuViewProps = {
  isOpen: boolean;
  anchorRect: { left: number; top: number; bottom: number } | null;
  commands: SlashCommand[];
  selectedIndex: number;
  onSelect: (command: SlashCommand) => void;
  onHover: (index: number) => void;
};

/**
 * Estimate menu height based on commands
 */
function estimateHeight(commands: SlashCommand[]): number {
  const basicCount = commands.filter((cmd) => cmd.group === 'basic').length;
  const advancedCount = commands.filter(
    (cmd) => cmd.group === 'advanced',
  ).length;
  const groupCount = Number(basicCount > 0) + Number(advancedCount > 0);
  return (
    commands.length * SLASH_MENU_ITEM_HEIGHT +
    groupCount * SLASH_MENU_GROUP_HEIGHT +
    SLASH_MENU_FRAME_HEIGHT
  );
}

export function SlashMenuView({
  isOpen,
  anchorRect,
  commands,
  selectedIndex,
  onSelect,
  onHover,
}: SlashMenuViewProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Compute layout
  const menuHeight = estimateHeight(commands);
  const layout =
    anchorRect && isOpen
      ? computeSlashMenuLayout({
          anchorRect,
          menuHeight,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
        })
      : null;

  // Scroll active item into view
  useLayoutEffect(() => {
    if (!isOpen || !menuRef.current) return;
    const newScrollTop = computeKeyboardScrollTop(
      menuRef.current,
      selectedIndex,
    );
    if (newScrollTop !== null) {
      menuRef.current.scrollTop = newScrollTop;
    }
  }, [selectedIndex, isOpen]);

  if (!isOpen || !anchorRect || !layout) return null;

  const groups: Array<'basic' | 'advanced'> = ['basic', 'advanced'];
  const groupLabels: Record<'basic' | 'advanced', string> = {
    basic: t('slash.basicBlocks'),
    advanced: t('slash.advanced'),
  };

  return (
    <div
      ref={menuRef}
      className="editor-slash-menu is-open"
      style={layout}
      role="listbox"
      aria-label="Slash commands"
    >
      {commands.length === 0 ? (
        <div className="editor-slash-menu__empty">{t('slash.noMatch')}</div>
      ) : (
        groups.map((group) => {
          const groupItems = commands.filter((cmd) => cmd.group === group);
          if (groupItems.length === 0) return null;
          return (
            <div key={group}>
              <div className="editor-slash-menu__group">
                {groupLabels[group]}
              </div>
              {groupItems.map((cmd) => {
                const absoluteIndex = commands.findIndex(
                  (item) => item.id === cmd.id,
                );
                return (
                  <button
                    key={cmd.id}
                    type="button"
                    className={`editor-slash-menu__item ${
                      selectedIndex === absoluteIndex ? 'is-active' : ''
                    }`}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => onHover(absoluteIndex)}
                    onClick={() => onSelect(cmd)}
                    role="option"
                    aria-selected={selectedIndex === absoluteIndex}
                  >
                    <span>{cmd.label}</span>
                    <span className="editor-slash-menu__hint">{cmd.hint}</span>
                  </button>
                );
              })}
            </div>
          );
        })
      )}
    </div>
  );
}

export type SlashInlineViewProps = {
  isOpen: boolean;
  anchorRect: { left: number; top: number } | null;
  query: string;
};

export function SlashInlineView({
  isOpen,
  anchorRect,
  query,
}: SlashInlineViewProps) {
  if (!isOpen || !anchorRect) return null;

  return (
    <div
      className="editor-slash-inline is-open"
      style={{ left: anchorRect.left + 4, top: anchorRect.top - 1 }}
      aria-hidden="true"
    >
      <span className="editor-slash-inline__trigger">/</span>
      {query ? (
        <span className="editor-slash-inline__query">{query}</span>
      ) : null}
    </div>
  );
}
