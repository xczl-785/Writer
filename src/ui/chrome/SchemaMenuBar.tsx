import { useEffect, useRef, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { getLocale, t } from '../../shared/i18n';
import { menuCommandBus } from '../commands/menuCommandBus';
import type { MenuSchemaGroup, MenuSchemaItem } from './menuSchema';

type SchemaMenuBarProps = {
  groups: MenuSchemaGroup[];
  isItemEnabled?: (item: MenuSchemaItem) => boolean;
  dispatch?: (id: string) => boolean;
};

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
      window.removeEventListener('mousedown', handleWindowClick);
      window.removeEventListener('keydown', handleWindowKeyDown);
    };
  }, []);

  function toggleGroup(id: string): void {
    setOpenSubmenuId(null);
    setOpenGroupId((currentId) => (currentId === id ? null : id));
  }

  function dispatchCommand(item: MenuSchemaItem): void {
    if (item.separator || item.children || !isItemEnabled(item)) {
      return;
    }

    dispatch(item.id);
    setOpenSubmenuId(null);
    setOpenGroupId(null);
  }

  function renderItem(item: MenuSchemaItem) {
    if (item.separator) {
      const label = resolveMenuSchemaLabel(item);
      return (
        <div key={item.id} className="schema-menu-separator">
          {label ? <span>{label}</span> : null}
        </div>
      );
    }

    const enabled = isItemEnabled(item);
    const hasChildren = (item.children?.length ?? 0) > 0;
    const isSubmenuOpen = openSubmenuId === item.id;

    return (
      <div
        key={item.id}
        className="schema-menu-item-wrap"
        onMouseEnter={() => {
          if (hasChildren) setOpenSubmenuId(item.id);
        }}
      >
        <button
          type="button"
          className="schema-menu-item"
          data-menu-item-id={item.id}
          disabled={!enabled}
          onClick={() => dispatchCommand(item)}
        >
          <span>{resolveMenuSchemaLabel(item)}</span>
          {hasChildren ? (
            <ChevronRight aria-hidden="true" size={14} />
          ) : (
            <span>{item.accelerator ?? ''}</span>
          )}
        </button>
        {hasChildren && isSubmenuOpen ? (
          <div className="schema-menu-submenu">
            {item.children?.map((child) => renderItem(child))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="schema-menu-bar"
      data-menu-open={openGroupId !== null ? '' : undefined}
    >
      {groups.map((group) => {
        const isOpen = openGroupId === group.id;
        return (
          <div key={group.id} className="schema-menu-group">
            <button
              type="button"
              className="schema-menu-group-button"
              data-menu-group-id={group.id}
              aria-expanded={isOpen}
              onClick={() => toggleGroup(group.id)}
            >
              {resolveMenuSchemaLabel(group)}
            </button>
            {isOpen ? (
              <div className="schema-menu-popover">
                {group.items.map((item) => renderItem(item))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
