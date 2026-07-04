import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { ChevronRight } from 'lucide-react';
import { getLocale, t } from '../../shared/i18n';
import { menuCommandBus } from '../commands/menuCommandBus';
import type { MenuSchemaGroup, MenuSchemaItem } from './menuSchema';

type SchemaMenuBarProps = {
  groups: MenuSchemaGroup[];
  isItemEnabled?: (item: MenuSchemaItem) => boolean;
  dispatch?: (id: string) => boolean;
};

type PendingFocusTarget =
  | { type: 'group'; groupIndex: number }
  | { type: 'item'; groupId: string; itemIndex: number }
  | null;

export function resolveMenuSchemaLabel(item: {
  labelKey: string;
  fallbackLabels: Record<'zh-CN' | 'en-US', string>;
}): string {
  const translated = t(item.labelKey);
  if (translated !== item.labelKey) {
    return translated;
  }

  return item.fallbackLabels[getLocale()] ?? item.fallbackLabels['en-US'];
}

export function SchemaMenuBar({
  groups,
  isItemEnabled = (item) => item.enabled !== false && !item.separator,
  dispatch = menuCommandBus.dispatch,
}: SchemaMenuBarProps) {
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [openSubmenuId, setOpenSubmenuId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const groupButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const itemButtonRefs = useRef<
    Record<string, Array<HTMLButtonElement | null>>
  >({});
  const pendingFocusRef = useRef<PendingFocusTarget>(null);
  const submenuCloseTimerRef = useRef<number | null>(null);

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
    function handleWindowClick(event: MouseEvent): void {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpenGroupId(null);
        setOpenSubmenuId(null);
      }
    }

    function handleWindowKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setOpenGroupId(null);
        setOpenSubmenuId(null);
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
    if (item.separator || item.children || !isItemEnabled(item)) {
      return;
    }

    dispatch(item.id);
    setOpenSubmenuId(null);
    setOpenGroupId(null);
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
      const label = resolveMenuSchemaLabel(item);
      return (
        <div key={item.id} className="py-1 first:pt-0">
          {label ? (
            <div className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-zinc-400">
              {label}
            </div>
          ) : (
            <div className="my-1 h-px bg-zinc-200" />
          )}
        </div>
      );
    }

    const enabled = isItemEnabled(item);
    const hasChildren = (item.children?.length ?? 0) > 0;
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
          data-menu-item-id={item.id}
          disabled={!enabled}
          onClick={() => dispatchCommand(item)}
          onKeyDown={(event) =>
            handleItemKeyDown(event, group, groupIndex, item, itemIndex)
          }
        >
          <span>{resolveMenuSchemaLabel(item)}</span>
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
              {item.children?.map((child) => (
                <div
                  key={child.id}
                  className={`flex items-center justify-between gap-4 rounded-md px-3 py-2 text-left text-[13px] ${
                    isItemEnabled(child) ? 'text-zinc-700' : 'text-zinc-300'
                  }`}
                >
                  <span>{resolveMenuSchemaLabel(child)}</span>
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

  return (
    <div
      ref={rootRef}
      className="flex items-center gap-1"
      data-no-drag
      data-menu-open={openGroupId !== null ? '' : undefined}
    >
      {groups.map((group, groupIndex) => {
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
              data-menu-group-id={group.id}
              aria-expanded={isOpen}
              onClick={() => toggleGroup(group.id)}
              onKeyDown={(event) =>
                handleGroupKeyDown(event, group, groupIndex)
              }
            >
              {resolveMenuSchemaLabel(group)}
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
      })}
    </div>
  );
}
