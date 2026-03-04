/**
 * Slash menu component for TipTap editor
 *
 * Provides a command palette triggered by '/' for quick block insertion.
 */
import {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
  useLayoutEffect,
} from 'react';
import type { CSSProperties } from 'react';
import type { Editor } from '@tiptap/react';
import { match } from 'pinyin-pro';
import { isStrictSlashTriggerEligible } from './slashEligibility';
import { t, getLocale } from '../../../i18n';
import { isInsertTextLikeInput, isSlashTriggerChar } from '../domain';

const SLASH_MENU_MAX_ITEMS = 14;
const SLASH_MENU_WIDTH = 260;
const SLASH_MENU_EDGE_PADDING = 10;
const SLASH_MENU_FLIP_THRESHOLD = 500;
const SLASH_MENU_ITEM_HEIGHT = 34;
const SLASH_MENU_GROUP_HEIGHT = 24;
const SLASH_MENU_FRAME_HEIGHT = 8;
const SLASH_MENU_FLIP_GAP = 36;
const SLASH_MENU_SCROLL_BUFFER = 16;

export type SlashPhase = 'idle' | 'open' | 'searching' | 'executing';

export type SlashCommand = {
  id: string;
  group: 'basic' | 'advanced';
  label: string;
  hint: string;
  keywords: string[];
  run: (editor: Editor) => void;
};

export type SlashMenuState = {
  phase: SlashPhase;
  query: string;
  menuX: number;
  menuY: number;
  inlineX: number;
  inlineY: number;
};

export type UseSlashMenuOptions = {
  editor: Editor | null;
  defaultTableInsert: { rows: number; cols: number; withHeaderRow: boolean };
  getSafeCoordsAtPos: (
    editor: Editor,
    pos: number,
  ) => { left: number; top: number; bottom: number } | null;
};

export function useSlashMenu({
  editor,
  defaultTableInsert,
  getSafeCoordsAtPos,
}: UseSlashMenuOptions) {
  const [slashState, setSlashState] = useState<SlashMenuState>({
    phase: 'idle',
    query: '',
    menuX: 0,
    menuY: 0,
    inlineX: 0,
    inlineY: 0,
  });
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);
  const composingRef = useRef(false);

  const slashCommands = useMemo<SlashCommand[]>(
    () => [
      {
        id: 'heading1',
        group: 'basic',
        label: t('slash.heading1'),
        hint: '⌘1',
        keywords: ['h1', 'title', 'heading'],
        run: (instance) => {
          instance.chain().focus().toggleHeading({ level: 1 }).run();
        },
      },
      {
        id: 'heading2',
        group: 'basic',
        label: t('slash.heading2'),
        hint: '⌘2',
        keywords: ['h2', 'heading'],
        run: (instance) => {
          instance.chain().focus().toggleHeading({ level: 2 }).run();
        },
      },
      {
        id: 'heading3',
        group: 'basic',
        label: t('slash.heading3'),
        hint: '⌘3',
        keywords: ['h3', 'heading'],
        run: (instance) => {
          instance.chain().focus().toggleHeading({ level: 3 }).run();
        },
      },
      {
        id: 'heading4',
        group: 'basic',
        label: t('slash.heading4'),
        hint: '⌘4',
        keywords: ['h4', 'heading'],
        run: (instance) => {
          instance.chain().focus().toggleHeading({ level: 4 }).run();
        },
      },
      {
        id: 'heading5',
        group: 'basic',
        label: t('slash.heading5'),
        hint: '⌘5',
        keywords: ['h5', 'heading'],
        run: (instance) => {
          instance.chain().focus().toggleHeading({ level: 5 }).run();
        },
      },
      {
        id: 'heading6',
        group: 'basic',
        label: t('slash.heading6'),
        hint: '⌘6',
        keywords: ['h6', 'heading'],
        run: (instance) => {
          instance.chain().focus().toggleHeading({ level: 6 }).run();
        },
      },
      {
        id: 'unorderedList',
        group: 'basic',
        label: t('slash.unorderedList'),
        hint: '⌥⌘U',
        keywords: ['list', 'bullet', 'ul'],
        run: (instance) => {
          instance.chain().focus().toggleBulletList().run();
        },
      },
      {
        id: 'orderedList',
        group: 'basic',
        label: t('slash.orderedList'),
        hint: '⌥⌘O',
        keywords: ['list', 'number', 'ol'],
        run: (instance) => {
          instance.chain().focus().toggleOrderedList().run();
        },
      },
      {
        id: 'taskList',
        group: 'basic',
        label: t('slash.taskList'),
        hint: '',
        keywords: ['task', 'todo', 'checkbox', 'checklist'],
        run: (instance) => {
          instance.chain().focus().toggleTaskList().run();
        },
      },
      {
        id: 'table',
        group: 'advanced',
        label: t('slash.table'),
        hint: '⌥⌘T',
        keywords: ['table', 'grid'],
        run: (instance) => {
          instance.chain().focus().insertTable(defaultTableInsert).run();
        },
      },
      {
        id: 'codeBlock',
        group: 'advanced',
        label: t('slash.codeBlock'),
        hint: '⌥⌘C',
        keywords: ['code', 'pre'],
        run: (instance) => {
          instance.chain().focus().toggleCodeBlock().run();
        },
      },
      {
        id: 'blockquote',
        group: 'advanced',
        label: t('slash.blockquote'),
        hint: '⇧⌘Q',
        keywords: ['quote', 'blockquote'],
        run: (instance) => {
          instance.chain().focus().toggleBlockquote().run();
        },
      },
      {
        id: 'horizontalRule',
        group: 'advanced',
        label: t('slash.horizontalRule'),
        hint: '',
        keywords: ['hr', 'divider', 'line', 'separator'],
        run: (instance) => {
          instance.chain().focus().setHorizontalRule().run();
        },
      },
      {
        id: 'image',
        group: 'advanced',
        label: t('slash.image'),
        hint: '',
        keywords: ['img', 'picture', 'photo'],
        run: (instance) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.onchange = async () => {
            const file = input.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = () => {
                const dataUrl = reader.result as string;
                instance.chain().focus().setImage({ src: dataUrl }).run();
              };
              reader.readAsDataURL(file);
            }
          };
          input.click();
        },
      },
    ],
    [defaultTableInsert],
  );

  const filteredSlashCommands = useMemo(() => {
    const query = slashState.query.trim();
    if (!query) return slashCommands.slice(0, SLASH_MENU_MAX_ITEMS);

    const queryLower = query.toLowerCase();
    const isZhCN = getLocale() === 'zh-CN';

    const filtered = slashCommands.filter((cmd) => {
      const labelLower = cmd.label.toLowerCase();
      const keywordsLower = cmd.keywords.join(' ').toLowerCase();

      if (labelLower.includes(queryLower)) return true;
      if (keywordsLower.includes(queryLower)) return true;

      if (isZhCN) {
        const matchResult = match(cmd.label, query, { precision: 'start' });
        if (matchResult && matchResult.length > 0) return true;
      }

      return false;
    });

    return filtered.slice(0, SLASH_MENU_MAX_ITEMS);
  }, [slashCommands, slashState.query]);

  // Reset selected index when query or phase changes
  useEffect(() => {
    setSlashSelectedIndex(0);
  }, [slashState.query, slashState.phase]);

  // Set up event handlers
  useEffect(() => {
    if (!editor) return;

    const isSlashTriggerEligible = () => isStrictSlashTriggerEligible(editor);

    const openSlash = () => {
      const { selection } = editor.state;
      const rect = getSafeCoordsAtPos(editor, selection.from);
      if (!rect) {
        return;
      }
      setSlashState({
        phase: 'open',
        query: '',
        menuX: rect.left,
        menuY: rect.bottom + 8,
        inlineX: rect.left + 4,
        inlineY: rect.top + 2,
      });
    };

    const closeSlash = () => {
      setSlashState((prev) => ({ ...prev, phase: 'idle', query: '' }));
    };

    const appendSlashQuery = (text: string) => {
      setSlashState((prev) => ({
        ...prev,
        phase: 'searching',
        query: `${prev.query}${text}`,
      }));
    };

    const deleteSlashQuery = () => {
      setSlashState((prev) => {
        if (prev.query.length === 0) {
          return { ...prev, phase: 'idle' };
        }
        const nextQuery = prev.query.slice(0, -1);
        return {
          ...prev,
          query: nextQuery,
          phase: nextQuery.length > 0 ? 'searching' : 'open',
        };
      });
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!editor.isFocused) {
        return;
      }

      if (event.isComposing || composingRef.current) {
        return;
      }

      if (slashState.phase === 'idle') {
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeSlash();
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        event.stopPropagation();
        setSlashSelectedIndex((prev) => {
          if (filteredSlashCommands.length === 0) return 0;
          return (prev + 1) % filteredSlashCommands.length;
        });
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();
        setSlashSelectedIndex((prev) => {
          if (filteredSlashCommands.length === 0) return 0;
          return (
            (prev - 1 + filteredSlashCommands.length) %
            filteredSlashCommands.length
          );
        });
        return;
      }

      if (event.key === 'Backspace') {
        event.preventDefault();
        event.stopPropagation();
        deleteSlashQuery();
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        event.stopPropagation();
        const command = filteredSlashCommands[slashSelectedIndex];
        if (command) {
          setSlashState((prev) => ({ ...prev, phase: 'executing' }));
          command.run(editor);
        }
        closeSlash();
        return;
      }

      if (event.key === 'Tab') {
        event.preventDefault();
        event.stopPropagation();
        setSlashSelectedIndex((prev) => {
          if (filteredSlashCommands.length === 0) return 0;
          return (prev + 1) % filteredSlashCommands.length;
        });
      }
    };

    const onBeforeInput = (event: InputEvent) => {
      if (!editor.isFocused) return;

      if (slashState.phase === 'idle') {
        if (
          isInsertTextLikeInput(event.inputType) &&
          isSlashTriggerChar(event.data)
        ) {
          if (!isSlashTriggerEligible()) {
            return;
          }
          event.preventDefault();
          openSlash();
        }
        return;
      }

      if (event.isComposing || composingRef.current) {
        return;
      }

      if (event.inputType === 'deleteContentBackward') {
        event.preventDefault();
        deleteSlashQuery();
        return;
      }

      if (isInsertTextLikeInput(event.inputType) && event.data) {
        event.preventDefault();
        appendSlashQuery(event.data);
      }
    };

    const onCompositionStart = () => {
      composingRef.current = true;
    };

    const onCompositionEnd = (event: CompositionEvent) => {
      composingRef.current = false;
      if (!editor.isFocused) return;
      const data = event.data ?? '';

      if (slashState.phase !== 'idle') {
        if (data) {
          const { selection } = editor.state;
          const insertedLength = data.length;
          if (selection.from >= insertedLength) {
            editor
              .chain()
              .deleteRange({
                from: selection.from - insertedLength,
                to: selection.from,
              })
              .run();
          }
          appendSlashQuery(data);
        }
        return;
      }

      if (isSlashTriggerChar(data)) {
        const { selection } = editor.state;
        const $from = selection.$from;
        const parent = $from.parent;
        const triggeredByCommittedChar =
          $from.depth === 1 &&
          parent.type.name === 'paragraph' &&
          parent.childCount === 1 &&
          parent.firstChild?.isText === true &&
          parent.textContent === data;

        if (!isSlashTriggerEligible() && !triggeredByCommittedChar) {
          return;
        }

        if (triggeredByCommittedChar && selection.from > 0) {
          editor
            .chain()
            .focus()
            .deleteRange({ from: selection.from - 1, to: selection.from })
            .run();
        }

        openSlash();
      }
    };

    const onPointerDown = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('.editor-slash-menu')) {
        return;
      }
      closeSlash();
    };

    let dom: HTMLElement | null = null;
    try {
      dom = editor.view.dom as HTMLElement;
    } catch {
      return;
    }
    if (!dom) {
      return;
    }

    dom.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('mousedown', onPointerDown);
    dom.addEventListener('beforeinput', onBeforeInput as EventListener);
    dom.addEventListener('compositionstart', onCompositionStart);
    dom.addEventListener('compositionend', onCompositionEnd as EventListener);

    return () => {
      dom?.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('mousedown', onPointerDown);
      dom?.removeEventListener('beforeinput', onBeforeInput as EventListener);
      dom?.removeEventListener('compositionstart', onCompositionStart);
      dom?.removeEventListener(
        'compositionend',
        onCompositionEnd as EventListener,
      );
    };
  }, [
    editor,
    filteredSlashCommands,
    getSafeCoordsAtPos,
    slashSelectedIndex,
    slashState.phase,
  ]);

  const executeCommand = useCallback(
    (command: SlashCommand) => {
      if (editor) {
        command.run(editor);
        setSlashState((prev) => ({ ...prev, phase: 'idle', query: '' }));
      }
    },
    [editor],
  );

  return {
    slashState,
    slashCommands: filteredSlashCommands,
    slashSelectedIndex,
    setSlashSelectedIndex,
    executeCommand,
  };
}

export type SlashMenuProps = {
  isOpen: boolean;
  x: number;
  y: number;
  commands: SlashCommand[];
  selectedIndex: number;
  onSelect: (command: SlashCommand) => void;
  onHover: (index: number) => void;
};

type SlashMenuLayoutInput = {
  x: number;
  y: number;
  menuWidth: number;
  menuHeight: number;
  viewportWidth: number;
  viewportHeight: number;
};

type SlashMenuLayout = {
  left: number;
  top: number;
  maxHeight?: string;
  overflowY?: CSSProperties['overflowY'];
};

const estimateSlashMenuHeight = (commands: SlashCommand[]): number => {
  const basicCount = commands.filter((command) => command.group === 'basic').length;
  const advancedCount = commands.filter(
    (command) => command.group === 'advanced',
  ).length;
  const groupCount = Number(basicCount > 0) + Number(advancedCount > 0);

  return (
    commands.length * SLASH_MENU_ITEM_HEIGHT +
    groupCount * SLASH_MENU_GROUP_HEIGHT +
    SLASH_MENU_FRAME_HEIGHT
  );
};

export const computeSlashMenuLayout = ({
  x,
  y,
  menuWidth,
  menuHeight,
  viewportWidth,
  viewportHeight,
}: SlashMenuLayoutInput): SlashMenuLayout => {
  const maxLeft = viewportWidth - menuWidth - SLASH_MENU_EDGE_PADDING;
  const left = Math.max(
    SLASH_MENU_EDGE_PADDING,
    Math.min(x, Math.max(SLASH_MENU_EDGE_PADDING, maxLeft)),
  );

  const availableBelow = viewportHeight - y;
  const availableAbove = y;
  const shouldFlipUp =
    availableBelow < SLASH_MENU_FLIP_THRESHOLD && availableAbove >= menuHeight;
  const top = shouldFlipUp
    ? Math.max(SLASH_MENU_EDGE_PADDING, y - menuHeight - SLASH_MENU_FLIP_GAP)
    : y;

  if (viewportHeight < SLASH_MENU_FLIP_THRESHOLD) {
    return {
      left,
      top: Math.max(SLASH_MENU_EDGE_PADDING, top),
      maxHeight: '85vh',
      overflowY: 'auto',
    };
  }

  return { left, top: Math.max(SLASH_MENU_EDGE_PADDING, top) };
};

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
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [measuredMenuHeight, setMeasuredMenuHeight] = useState<number | null>(null);

  const groups: Array<'basic' | 'advanced'> = ['basic', 'advanced'];
  const groupLabels: Record<'basic' | 'advanced', string> = {
    basic: t('slash.basicBlocks'),
    advanced: t('slash.advanced'),
  };
  const menuHeight = measuredMenuHeight ?? estimateSlashMenuHeight(commands);
  const layout = computeSlashMenuLayout({
    x,
    y,
    menuWidth: SLASH_MENU_WIDTH,
    menuHeight,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
  });

  useLayoutEffect(() => {
    const nextHeight = menuRef.current?.offsetHeight ?? 0;
    if (nextHeight <= 0 || measuredMenuHeight === nextHeight) {
      return;
    }
    setMeasuredMenuHeight(nextHeight);
  }, [commands, measuredMenuHeight, selectedIndex]);

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const activeItem = menu.querySelector<HTMLButtonElement>(
      '.editor-slash-menu__item.is-active',
    );
    if (!activeItem) return;

    const itemTop = activeItem.offsetTop;
    const itemBottom = itemTop + activeItem.offsetHeight;
    const visibleTop = menu.scrollTop + SLASH_MENU_SCROLL_BUFFER;
    const visibleBottom =
      menu.scrollTop + menu.clientHeight - SLASH_MENU_SCROLL_BUFFER;

    if (itemTop < visibleTop) {
      menu.scrollTop = Math.max(0, itemTop - SLASH_MENU_SCROLL_BUFFER);
      return;
    }
    if (itemBottom > visibleBottom) {
      menu.scrollTop = Math.max(
        0,
        itemBottom - menu.clientHeight + SLASH_MENU_SCROLL_BUFFER,
      );
    }
  }, [selectedIndex]);

  return (
    <div
      ref={menuRef}
      className={`editor-slash-menu ${isOpen ? 'is-open' : ''}`}
      style={layout}
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

export type SlashInlineProps = {
  isOpen: boolean;
  x: number;
  y: number;
  query: string;
};

export function SlashInline({ isOpen, x, y, query }: SlashInlineProps) {
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
