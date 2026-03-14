/**
 * Slash Menu Component
 *
 * Main export file for slash menu functionality.
 * Re-exports types and components for external use.
 */

import { t } from '../../../../shared/i18n';
import type { SlashCommand as SlashCommandType } from './useSlashMenu';

// Re-export types
export type {
  SlashCommand,
  UseSlashMenuOptions,
  UseSlashMenuResult,
} from './useSlashMenu';
export type {
  SlashPhase,
  SlashSession,
  SlashAction,
  AnchorRect,
} from '../../domain';

// Re-export from domain
export {
  createInitialSlashSession,
  slashReducer,
  isOpenPhase,
  isActivePhase,
  SLASH_MENU_WIDTH,
  SLASH_MENU_EDGE_PADDING,
  SLASH_MENU_FLIP_THRESHOLD,
  SLASH_MENU_FLIP_SAFE_GAP,
  SLASH_MENU_ITEM_HEIGHT,
  SLASH_MENU_GROUP_HEIGHT,
  SLASH_MENU_FRAME_HEIGHT,
  SLASH_MENU_TRIGGER_GAP,
  computeSlashMenuLayout,
  computeSlashInlinePosition,
  computeKeyboardScrollTop,
} from '../../domain';

// Re-export components
export { useSlashMenu } from './useSlashMenu';
export { SlashMenuView, SlashInlineView } from './SlashMenuView';

// Legacy exports for backward compatibility
export type SlashMenuState = {
  phase: 'idle' | 'open' | 'searching' | 'executing';
  query: string;
  menuX: number;
  menuY: number;
  inlineX: number;
  inlineY: number;
};

export type SlashMenuProps = {
  isOpen: boolean;
  x: number;
  y: number;
  commands: SlashCommandType[];
  selectedIndex: number;
  onSelect: (command: SlashCommandType) => void;
  onHover: (index: number) => void;
};

export type SlashInlineProps = {
  isOpen: boolean;
  x: number;
  y: number;
  query: string;
};

/**
 * Legacy SlashMenu component for backward compatibility
 */
export function SlashMenu({
  isOpen,
  x,
  y,
  commands,
  selectedIndex,
  onSelect,
  onHover,
}: SlashMenuProps) {
  if (!isOpen) return null;

  return (
    <div
      className={`editor-slash-menu ${isOpen ? 'is-open' : ''}`}
      style={{ left: x, top: y }}
      role="listbox"
      aria-label="Slash commands"
    >
      {commands.length === 0 ? (
        <div className="editor-slash-menu__empty">{t('slash.noMatch')}</div>
      ) : (
        renderCommands(commands, selectedIndex, onSelect, onHover)
      )}
    </div>
  );
}

function renderCommands(
  commands: SlashCommandType[],
  selectedIndex: number,
  onSelect: (cmd: SlashCommandType) => void,
  onHover: (index: number) => void,
) {
  const groups: Array<'basic' | 'advanced'> = ['basic', 'advanced'];
  const groupLabels: Record<'basic' | 'advanced', string> = {
    basic: t('slash.basicBlocks'),
    advanced: t('slash.advanced'),
  };

  return groups.map((group) => {
    const groupItems = commands.filter((cmd) => cmd.group === group);
    if (groupItems.length === 0) return null;
    return (
      <div key={group}>
        <div className="editor-slash-menu__group">{groupLabels[group]}</div>
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
  });
}

/**
 * Legacy SlashInline component for backward compatibility
 */
export function SlashInline({ isOpen, x, y, query }: SlashInlineProps) {
  if (!isOpen) return null;

  return (
    <div
      className={`editor-slash-inline ${isOpen ? 'is-open' : ''}`}
      style={{ left: x, top: y }}
      aria-hidden="true"
    >
      <span className="editor-slash-inline__trigger">/</span>
      {query ? (
        <span className="editor-slash-inline__query">{query}</span>
      ) : null}
    </div>
  );
}
