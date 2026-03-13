/**
 * RecentWorkspacesMenu Component
 *
 * A dropdown menu component displaying recently opened workspaces, folders, and files.
 * Follows V6 interaction design specification section 2.5.
 *
 * @see docs/current/阶段文档/V6-工作区交互设计规范.md - 2.5 最近项目菜单
 * @see docs/current/阶段文档/V6-工作区功能需求文档.md - WS-09, WS-10
 */

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { createPortal } from 'react-dom';
import {
  RecentItemsService,
  type RecentItem,
  type RecentWorkspace,
  type RecentFolder,
  type RecentFile,
} from '../../../services/recent/RecentItemsService';
import { t } from '../../../i18n';

interface RecentWorkspacesMenuProps {
  /** Whether the menu is visible */
  isOpen: boolean;
  /** Position of the menu anchor */
  anchorEl?: HTMLElement | null;
  /** Callback when a workspace is selected */
  onSelectWorkspace?: (path: string) => void;
  /** Callback when a folder is selected */
  onSelectFolder?: (path: string) => void;
  /** Callback when a file is selected */
  onSelectFile?: (path: string) => void;
  /** Callback when menu closes */
  onClose: () => void;
}

/**
 * Get icon for item type
 */
function getItemIcon(type: 'workspace' | 'folder' | 'file'): string {
  switch (type) {
    case 'workspace':
      return '💼';
    case 'folder':
      return '📁';
    case 'file':
      return '📄';
  }
}

/**
 * Menu item component
 */
const MenuItem: React.FC<{
  item: RecentItem;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  isFocused: boolean;
}> = ({ item, onClick, onContextMenu, isFocused }) => {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isFocused && ref.current) {
      ref.current.focus();
    }
  }, [isFocused]);

  return (
    <button
      ref={ref}
      type="button"
      role="menuitem"
      tabIndex={isFocused ? 0 : -1}
      onClick={onClick}
      onContextMenu={onContextMenu}
      title={item.path}
      className={`
        w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left
        transition-colors duration-100 ease-out
        ${
          isFocused
            ? 'bg-zinc-100 dark:bg-zinc-700'
            : 'text-zinc-800 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-zinc-700'
        }
      `}
    >
      <span className="flex-shrink-0 w-4 h-4 text-center" aria-hidden="true">
        {getItemIcon(item.type)}
      </span>
      <span className="flex-1 truncate">{item.name}</span>
      {item.type === 'workspace' && (
        <span className="flex-shrink-0 text-xs text-zinc-400">
          {t('recent.workspace')}
        </span>
      )}
    </button>
  );
};

/**
 * Section header component
 */
const SectionHeader: React.FC<{ label: string }> = ({ label }) => (
  <div
    role="presentation"
    className="px-3 py-1 text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wide"
  >
    {label}
  </div>
);

/**
 * Divider component
 */
const MenuDivider: React.FC = () => (
  <hr className="my-1 border-t border-zinc-200 dark:border-zinc-700" />
);

/**
 * Clear history menu item
 */
const ClearHistoryItem: React.FC<{
  onClick: () => void;
  isFocused: boolean;
}> = ({ onClick, isFocused }) => {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isFocused && ref.current) {
      ref.current.focus();
    }
  }, [isFocused]);

  return (
    <button
      ref={ref}
      type="button"
      role="menuitem"
      tabIndex={isFocused ? 0 : -1}
      onClick={onClick}
      className={`
        w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left
        text-zinc-500 hover:text-red-500
        transition-colors duration-100 ease-out
        ${
          isFocused
            ? 'bg-zinc-100 dark:bg-zinc-700'
            : 'hover:bg-zinc-100 dark:hover:bg-zinc-700'
        }
      `}
    >
      <span className="flex-1">{t('recent.clearHistory')}</span>
    </button>
  );
};

/**
 * Empty state component
 */
const EmptyState: React.FC = () => (
  <div className="px-3 py-4 text-sm text-zinc-400 dark:text-zinc-500 text-center">
    {t('recent.empty')}
  </div>
);

/**
 * Main RecentWorkspacesMenu component
 */
export const RecentWorkspacesMenu: React.FC<RecentWorkspacesMenuProps> = ({
  isOpen,
  anchorEl,
  onSelectWorkspace,
  onSelectFolder,
  onSelectFile,
  onClose,
}) => {
  const [items, setItems] = useState<{
    workspaces: RecentWorkspace[];
    folders: RecentFolder[];
    files: RecentFile[];
  }>({ workspaces: [], folders: [], files: [] });
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const menuRef = useRef<HTMLDivElement>(null);

  // Load items when menu opens
  useEffect(() => {
    if (isOpen) {
      RecentItemsService.getAll().then(setItems);
      setFocusedIndex(-1);
    }
  }, [isOpen]);

  // Build flat list of items for keyboard navigation (memoized)
  const flatItems: Array<{ item: RecentItem; section: string }> = useMemo(
    () => [
      ...items.workspaces.map((item) => ({
        item,
        section: 'workspace' as const,
      })),
      ...items.folders.map((item) => ({ item, section: 'folder' as const })),
      ...items.files.map((item) => ({ item, section: 'file' as const })),
    ],
    [items.workspaces, items.folders, items.files],
  );

  const hasItems = flatItems.length > 0;

  // Calculate position
  const position = useCallback(() => {
    if (!anchorEl) {
      return { x: 100, y: 100 };
    }

    const rect = anchorEl.getBoundingClientRect();
    const menuWidth = 280;
    const menuEstimatedHeight = 400;
    const margin = 8;

    return {
      x: Math.max(
        margin,
        Math.min(rect.left, window.innerWidth - menuWidth - margin),
      ),
      y: Math.max(
        margin,
        Math.min(
          rect.bottom + 4,
          window.innerHeight - menuEstimatedHeight - margin,
        ),
      ),
    };
  }, [anchorEl]);

  // Handle clear history
  const handleClearHistory = useCallback(async () => {
    await RecentItemsService.clearAll();
    setItems({ workspaces: [], folders: [], files: [] });
    onClose();
  }, [onClose]);

  // Handle click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const totalItems = flatItems.length + (hasItems ? 1 : 0); // +1 for clear history

      switch (event.key) {
        case 'ArrowDown': {
          event.preventDefault();
          setFocusedIndex((prev) => (prev + 1) % totalItems);
          break;
        }
        case 'ArrowUp': {
          event.preventDefault();
          setFocusedIndex((prev) => (prev - 1 + totalItems) % totalItems);
          break;
        }
        case 'Enter':
        case ' ': {
          event.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < flatItems.length) {
            const { item, section } = flatItems[focusedIndex];
            if (section === 'workspace' && onSelectWorkspace) {
              onSelectWorkspace(item.path);
            } else if (section === 'folder' && onSelectFolder) {
              onSelectFolder(item.path);
            } else if (section === 'file' && onSelectFile) {
              onSelectFile(item.path);
            }
            onClose();
          } else if (focusedIndex === flatItems.length && hasItems) {
            handleClearHistory();
          }
          break;
        }
      }
    },
    [
      flatItems,
      focusedIndex,
      hasItems,
      onSelectWorkspace,
      onSelectFolder,
      onSelectFile,
      onClose,
      handleClearHistory,
    ],
  );

  // Handle item click
  const handleItemClick = useCallback(
    (item: RecentItem) => {
      if (item.type === 'workspace' && onSelectWorkspace) {
        onSelectWorkspace(item.path);
      } else if (item.type === 'folder' && onSelectFolder) {
        onSelectFolder(item.path);
      } else if (item.type === 'file' && onSelectFile) {
        onSelectFile(item.path);
      }
      onClose();
    },
    [onSelectWorkspace, onSelectFolder, onSelectFile, onClose],
  );

  // Handle right-click to remove item
  const handleItemContextMenu = useCallback(
    async (e: React.MouseEvent, item: RecentItem) => {
      e.preventDefault();
      await RecentItemsService.removeItem(item.type, item.path);
      const data = await RecentItemsService.getAll();
      setItems(data);
    },
    [],
  );

  if (!isOpen) return null;

  const pos = position();

  const menu = (
    <div
      ref={menuRef}
      role="menu"
      aria-label={t('recent.menuLabel')}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="fixed z-50 min-w-[220px] max-w-[280px] rounded-md border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-800"
      style={{
        left: pos.x,
        top: pos.y,
        animation: 'recentMenuFadeIn 150ms ease-out',
      }}
    >
      <div className="py-1 max-h-[60vh] overflow-y-auto">
        {!hasItems ? (
          <EmptyState />
        ) : (
          <>
            {/* Workspaces section */}
            {items.workspaces.length > 0 && (
              <>
                <SectionHeader label={t('recent.workspaces')} />
                {items.workspaces.map((item, index) => (
                  <MenuItem
                    key={`workspace-${item.path}`}
                    item={item}
                    onClick={() => handleItemClick(item)}
                    onContextMenu={(e) => handleItemContextMenu(e, item)}
                    isFocused={focusedIndex === index}
                  />
                ))}
              </>
            )}

            {/* Folders section */}
            {items.folders.length > 0 && (
              <>
                {items.workspaces.length > 0 && <MenuDivider />}
                <SectionHeader label={t('recent.folders')} />
                {items.folders.map((item, index) => (
                  <MenuItem
                    key={`folder-${item.path}`}
                    item={item}
                    onClick={() => handleItemClick(item)}
                    onContextMenu={(e) => handleItemContextMenu(e, item)}
                    isFocused={focusedIndex === items.workspaces.length + index}
                  />
                ))}
              </>
            )}

            {/* Files section */}
            {items.files.length > 0 && (
              <>
                {(items.workspaces.length > 0 || items.folders.length > 0) && (
                  <MenuDivider />
                )}
                <SectionHeader label={t('recent.files')} />
                {items.files.map((item, index) => (
                  <MenuItem
                    key={`file-${item.path}`}
                    item={item}
                    onClick={() => handleItemClick(item)}
                    onContextMenu={(e) => handleItemContextMenu(e, item)}
                    isFocused={
                      focusedIndex ===
                      items.workspaces.length + items.folders.length + index
                    }
                  />
                ))}
              </>
            )}

            {/* Clear history */}
            <MenuDivider />
            <ClearHistoryItem
              onClick={handleClearHistory}
              isFocused={focusedIndex === flatItems.length}
            />
          </>
        )}
      </div>
    </div>
  );

  return createPortal(menu, document.body);
};

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes recentMenuFadeIn {
    from {
      opacity: 0;
      transform: scale(0.95) translateY(-4px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
`;
document.head.appendChild(style);

export default RecentWorkspacesMenu;
