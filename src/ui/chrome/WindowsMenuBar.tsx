import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { ChevronRight } from 'lucide-react';
import { t, getLocale } from '../../shared/i18n';
import {
  RECENT_ITEMS_CHANGED_EVENT,
  RecentItemsService,
  type RecentItem,
} from '../../domains/workspace/services/RecentItemsService';
import {
  getWorkspaceContext,
  useWorkspaceStore,
} from '../../domains/workspace/state/workspaceStore';
import { useFileTreeStore } from '../../domains/file/state/fileStore';
import { menuCommandBus } from '../commands/menuCommandBus';
import {
  WINDOWS_MENU_SCHEMA,
  type MenuPlatform,
  type MenuSchemaGroup,
  type MenuSchemaItem,
} from './menuSchema';
import { isMenuItemEnabledForState } from './menuState';

type WindowsMenuBarProps = {
  hasRecentItems: boolean;
  platform: MenuPlatform;
};

function resolveLabel(
  labelKey: string,
  fallbackLabels: Record<'zh-CN' | 'en-US', string>,
): string {
  const translated = t(labelKey);
  if (translated !== labelKey) {
    return translated;
  }

  return fallbackLabels[getLocale()] ?? fallbackLabels['en-US'];
}

type PendingFocusTarget =
  | { type: 'group'; groupIndex: number }
  | { type: 'item'; groupId: string; itemIndex: number }
  | null;

const OPEN_RECENT_ITEM_EVENT = 'writer:open-recent-item';
const CLEAR_RECENT_ITEMS_EVENT = 'writer:clear-recent-items';

export function WindowsMenuBar({
  hasRecentItems,
  platform,
}: WindowsMenuBarProps) {
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [openSubmenuId, setOpenSubmenuId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const groupButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const itemButtonRefs = useRef<
    Record<string, Array<HTMLButtonElement | null>>
  >({});
  const pendingFocusRef = useRef<PendingFocusTarget>(null);
  const submenuCloseTimerRef = useRef<number | null>(null);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);

  const groups = WINDOWS_MENU_SCHEMA.filter((group) =>
    group.platforms.includes(platform),
  );
  const activeFile = useWorkspaceStore((state) => state.activeFile);
  const folders = useWorkspaceStore((state) => state.folders);
  const workspaceFile = useWorkspaceStore((state) => state.workspaceFile);
  const isDirty = useWorkspaceStore((state) => state.isDirty);
  const selectedPath = useFileTreeStore((state) => state.selectedPath);
  const hasSelectedRootFolder = folders.some(
    (folder) => folder.path === selectedPath,
  );

  const runtimeState = {
    workspaceContext: getWorkspaceContext({
      folders,
      workspaceFile,
      isDirty,
      openFiles: [],
      activeFile,
    }),
    hasActiveFile: activeFile !== null,
    hasRecentItems,
    hasSelectedRootFolder,
  };

  function isItemEnabled(item: MenuSchemaItem): boolean {
    if (item.children) {
      return true;
    }

    return (
      !item.separator &&
      isMenuItemEnabledForState(item.id, runtimeState, item.enabled !== false)
    );
  }

  function flushPendingFocus(): void {
    const pendingFocus = pendingFocusRef.current;
    if (!pendingFocus) {
      return;
    }

    pendingFocusRef.current = null;

    if (pendingFocus.type === 'group') {
      groupButtonRefs.current[pendingFocus.groupIndex]?.focus();
      return;
    }

    itemButtonRefs.current[pendingFocus.groupId]?.[
      pendingFocus.itemIndex
    ]?.focus();
  }

  useEffect(() => {
    flushPendingFocus();
  }, [openGroupId, groups]);

  useEffect(() => {
    if (openGroupId === null) {
      setOpenSubmenuId(null);
    }
  }, [openGroupId]);

  useEffect(() => {
    async function refreshRecentItems(): Promise<void> {
      const data = await RecentItemsService.getAll();
      setRecentItems([...data.workspaces, ...data.folders, ...data.files]);
    }

    void refreshRecentItems();

    function handleRecentItemsChanged(): void {
      void refreshRecentItems();
    }

    window.addEventListener(
      RECENT_ITEMS_CHANGED_EVENT,
      handleRecentItemsChanged,
    );
    return () => {
      window.removeEventListener(
        RECENT_ITEMS_CHANGED_EVENT,
        handleRecentItemsChanged,
      );
    };
  }, []);

  useEffect(() => {
    function handleWindowClick(event: MouseEvent): void {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpenGroupId(null);
      }
    }

    function handleWindowKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setOpenGroupId(null);
      }
    }

    window.addEventListener('mousedown', handleWindowClick);
    window.addEventListener('keydown', handleWindowKeyDown);
    return () => {
      if (submenuCloseTimerRef.current !== null) {
        window.clearTimeout(submenuCloseTimerRef.current);
      }
      window.removeEventListener('mousedown', handleWindowClick);
      window.removeEventListener('keydown', handleWindowKeyDown);
    };
  }, []);

  function toggleGroup(id: string): void {
    setOpenSubmenuId(null);
    setOpenGroupId((currentId) => (currentId === id ? null : id));
  }

  function openSubmenu(id: string): void {
    if (submenuCloseTimerRef.current !== null) {
      window.clearTimeout(submenuCloseTimerRef.current);
      submenuCloseTimerRef.current = null;
    }
    setOpenSubmenuId(id);
  }

  function scheduleCloseSubmenu(id: string): void {
    if (submenuCloseTimerRef.current !== null) {
      window.clearTimeout(submenuCloseTimerRef.current);
    }
    submenuCloseTimerRef.current = window.setTimeout(() => {
      setOpenSubmenuId((current) => (current === id ? null : current));
      submenuCloseTimerRef.current = null;
    }, 140);
  }

  function getEnabledItemIndexes(group: MenuSchemaGroup): number[] {
    return group.items.reduce<number[]>((indexes, item, index) => {
      if (isItemEnabled(item)) {
        indexes.push(index);
      }
      return indexes;
    }, []);
  }

  function focusGroupButton(groupIndex: number): void {
    pendingFocusRef.current = { type: 'group', groupIndex };
  }

  function openGroupWithItemFocus(
    group: MenuSchemaGroup,
    groupIndex: number,
    direction: 'first' | 'last',
  ): void {
    const enabledIndexes = getEnabledItemIndexes(group);
    if (enabledIndexes.length === 0) {
      focusGroupButton(groupIndex);
      setOpenGroupId(group.id);
      return;
    }

    const itemIndex =
      direction === 'first'
        ? enabledIndexes[0]
        : enabledIndexes[enabledIndexes.length - 1];
    pendingFocusRef.current = {
      type: 'item',
      groupId: group.id,
      itemIndex,
    };

    if (openGroupId === group.id) {
      queueMicrotask(() => flushPendingFocus());
      return;
    }

    setOpenGroupId(group.id);
  }

  function moveToSiblingGroup(
    currentGroupIndex: number,
    step: -1 | 1,
    itemDirection: 'first' | 'last' | null,
  ): void {
    const nextGroupIndex =
      (currentGroupIndex + step + groups.length) % groups.length;
    const nextGroup = groups[nextGroupIndex];
    if (!nextGroup) {
      return;
    }

    if (itemDirection) {
      openGroupWithItemFocus(nextGroup, nextGroupIndex, itemDirection);
      return;
    }

    focusGroupButton(nextGroupIndex);
    if (openGroupId) {
      setOpenGroupId(nextGroup.id);
      return;
    }
    setOpenGroupId(null);
  }

  function moveWithinGroup(
    group: MenuSchemaGroup,
    itemIndex: number,
    step: -1 | 1,
  ): void {
    const enabledIndexes = getEnabledItemIndexes(group);
    const currentEnabledIndex = enabledIndexes.indexOf(itemIndex);
    if (currentEnabledIndex === -1) {
      return;
    }

    const nextEnabledIndex =
      (currentEnabledIndex + step + enabledIndexes.length) %
      enabledIndexes.length;
    pendingFocusRef.current = {
      type: 'item',
      groupId: group.id,
      itemIndex: enabledIndexes[nextEnabledIndex],
    };

    if (openGroupId === group.id) {
      queueMicrotask(() => flushPendingFocus());
      return;
    }

    setOpenGroupId(group.id);
  }

  function dispatchCommand(item: MenuSchemaItem): void {
    if (
      !isItemEnabled(item) ||
      item.children ||
      item.id === 'menu.file.open_recent'
    ) {
      return;
    }

    menuCommandBus.dispatch(item.id);
    setOpenSubmenuId(null);
    setOpenGroupId(null);
  }

  function dispatchRecentItem(item: RecentItem): void {
    window.dispatchEvent(
      new CustomEvent<RecentItem>(OPEN_RECENT_ITEM_EVENT, { detail: item }),
    );
    setOpenSubmenuId(null);
    setOpenGroupId(null);
  }

  function clearRecentItems(): void {
    window.dispatchEvent(new CustomEvent(CLEAR_RECENT_ITEMS_EVENT));
    setOpenSubmenuId(null);
    setOpenGroupId(null);
  }

  function renderRecentSubmenu() {
    if (recentItems.length === 0) {
      return (
        <div className="rounded-md px-3 py-2 text-[13px] text-zinc-300">
          {t('recent.empty')}
        </div>
      );
    }

    return (
      <>
        {recentItems.slice(0, 8).map((item) => (
          <button
            key={`${item.type}:${item.path}`}
            type="button"
            className="flex w-full items-center justify-between gap-4 rounded-md px-3 py-2 text-left text-[13px] text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            onClick={() => dispatchRecentItem(item)}
            title={item.path}
          >
            <span className="truncate">{item.name}</span>
            <span className="text-[11px] text-zinc-400">
              {item.type === 'workspace'
                ? t('recent.workspace')
                : item.type === 'folder'
                  ? t('recent.folders')
                  : t('recent.files')}
            </span>
          </button>
        ))}
        <div className="my-1 h-px bg-zinc-200" />
        <button
          type="button"
          className="flex w-full items-center justify-between gap-4 rounded-md px-3 py-2 text-left text-[13px] text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-red-500"
          onClick={clearRecentItems}
        >
          <span>{t('recent.clearHistory')}</span>
          <span className="text-[11px] text-zinc-400" />
        </button>
      </>
    );
  }

  function handleGroupKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    group: MenuSchemaGroup,
    groupIndex: number,
  ): void {
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        moveToSiblingGroup(groupIndex, 1, null);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        moveToSiblingGroup(groupIndex, -1, null);
        break;
      case 'ArrowDown':
        event.preventDefault();
        openGroupWithItemFocus(group, groupIndex, 'first');
        break;
      case 'ArrowUp':
        event.preventDefault();
        openGroupWithItemFocus(group, groupIndex, 'last');
        break;
      case 'Home':
        event.preventDefault();
        focusGroupButton(0);
        setOpenGroupId(openGroupId ? (groups[0]?.id ?? null) : null);
        break;
      case 'End':
        event.preventDefault();
        focusGroupButton(groups.length - 1);
        setOpenGroupId(
          openGroupId ? (groups[groups.length - 1]?.id ?? null) : null,
        );
        break;
      default:
        break;
    }
  }

  function handleItemKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    group: MenuSchemaGroup,
    groupIndex: number,
    item: MenuSchemaItem,
    itemIndex: number,
  ): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveWithinGroup(group, itemIndex, 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveWithinGroup(group, itemIndex, -1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        moveToSiblingGroup(groupIndex, 1, 'first');
        break;
      case 'ArrowLeft':
        event.preventDefault();
        moveToSiblingGroup(groupIndex, -1, 'last');
        break;
      case 'Home':
        event.preventDefault();
        openGroupWithItemFocus(group, groupIndex, 'first');
        break;
      case 'End':
        event.preventDefault();
        openGroupWithItemFocus(group, groupIndex, 'last');
        break;
      case 'Escape':
        event.preventDefault();
        focusGroupButton(groupIndex);
        setOpenGroupId(null);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        dispatchCommand(item);
        break;
      default:
        break;
    }
  }

  function renderItem(
    item: MenuSchemaItem,
    group: MenuSchemaGroup,
    groupIndex: number,
    itemIndex: number,
  ) {
    if (item.separator) {
      const label = resolveLabel(item.labelKey, item.fallbackLabels);
      const showLabel = label.length > 0;
      return (
        <div key={item.id} className="py-1 first:pt-0">
          {showLabel ? (
            <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-400">
              {label}
            </div>
          ) : null}
          {!showLabel ? <div className="my-1 h-px bg-zinc-200" /> : null}
        </div>
      );
    }

    const enabled = isItemEnabled(item);
    const hasChildren =
      item.id === 'menu.file.open_recent' || (item.children?.length ?? 0) > 0;
    const isSubmenuOpen = openSubmenuId === item.id;
    return (
      <div
        key={item.id}
        className="group/item relative"
        onMouseEnter={() => {
          if (hasChildren) {
            openSubmenu(item.id);
          }
        }}
        onMouseLeave={() => {
          if (hasChildren) {
            scheduleCloseSubmenu(item.id);
          }
        }}
      >
        <button
          type="button"
          ref={(node) => {
            itemButtonRefs.current[group.id] ??= [];
            itemButtonRefs.current[group.id][itemIndex] = node;
          }}
          className={`flex w-full items-center justify-between gap-4 rounded-md px-3 py-2 text-left text-[13px] ${
            enabled
              ? 'text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300'
              : 'cursor-not-allowed text-zinc-300'
          }`}
          onClick={() => dispatchCommand(item)}
          onKeyDown={(event) =>
            handleItemKeyDown(event, group, groupIndex, item, itemIndex)
          }
        >
          <span>{resolveLabel(item.labelKey, item.fallbackLabels)}</span>
          {hasChildren ? (
            <ChevronRight className="h-4 w-4 text-zinc-400" />
          ) : (
            <span className="text-[11px] text-zinc-400">
              {item.accelerator ?? ''}
            </span>
          )}
        </button>
        {hasChildren && isSubmenuOpen ? (
          <>
            <div className="absolute left-full top-0 h-full w-[14px]" />
            <div
              className="absolute left-[calc(100%+14px)] top-0 min-w-[220px] rounded-xl border border-zinc-200 bg-white p-1 shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
              onMouseEnter={() => openSubmenu(item.id)}
              onMouseLeave={() => scheduleCloseSubmenu(item.id)}
            >
              {item.id === 'menu.file.open_recent'
                ? renderRecentSubmenu()
                : item.children?.map((child) => (
                    <div
                      key={child.id}
                      className={`flex items-center justify-between gap-4 rounded-md px-3 py-2 text-left text-[13px] ${
                        isItemEnabled(child) ? 'text-zinc-700' : 'text-zinc-300'
                      }`}
                    >
                      <span>
                        {resolveLabel(child.labelKey, child.fallbackLabels)}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {child.accelerator ?? ''}
                      </span>
                    </div>
                  ))}
            </div>
          </>
        ) : null}
      </div>
    );
  }

  function renderGroup(group: MenuSchemaGroup, groupIndex: number) {
    const isOpen = openGroupId === group.id;
    return (
      <div
        key={group.id}
        className="relative"
        onMouseEnter={() => {
          if (openGroupId && openGroupId !== group.id) {
            setOpenSubmenuId(null);
            setOpenGroupId(group.id);
          }
        }}
      >
        <button
          type="button"
          ref={(node) => {
            groupButtonRefs.current[groupIndex] = node;
          }}
          className={`rounded-md px-2 py-1 text-[13px] font-medium transition-colors ${
            isOpen
              ? 'bg-zinc-100 text-zinc-900'
              : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
          }`}
          aria-expanded={isOpen}
          onClick={() => toggleGroup(group.id)}
          onKeyDown={(event) => handleGroupKeyDown(event, group, groupIndex)}
        >
          {resolveLabel(group.labelKey, group.fallbackLabels)}
        </button>
        {isOpen ? (
          <div className="absolute left-0 top-[calc(100%+6px)] z-50 min-w-[320px] rounded-xl border border-zinc-200 bg-white p-2 shadow-[0_8px_30px_rgba(0,0,0,0.08)] animate-in fade-in zoom-in-95 duration-150">
            {group.items.map((item, itemIndex) =>
              renderItem(item, group, groupIndex, itemIndex),
            )}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="flex items-center gap-1"
      data-no-drag
      data-menu-open={openGroupId !== null ? '' : undefined}
    >
      {groups.map(renderGroup)}
    </div>
  );
}
