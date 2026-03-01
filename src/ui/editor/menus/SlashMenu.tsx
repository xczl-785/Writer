/**
 * Slash menu component for TipTap editor
 *
 * Provides a command palette triggered by '/' for quick block insertion.
 */
import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/react';

const SLASH_MENU_MAX_ITEMS = 8;

export type SlashPhase = 'idle' | 'open' | 'searching' | 'executing';

export type SlashCommand = {
  id: string;
  group: 'Basic Blocks' | 'Advanced Components';
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
        group: 'Basic Blocks',
        label: 'Heading 1',
        hint: '⌘1',
        keywords: ['h1', 'title', 'heading'],
        run: (instance) => {
          instance.chain().focus().toggleHeading({ level: 1 }).run();
        },
      },
      {
        id: 'unorderedList',
        group: 'Basic Blocks',
        label: 'Unordered List',
        hint: '⌥⌘U',
        keywords: ['list', 'bullet', 'ul'],
        run: (instance) => {
          instance.chain().focus().toggleBulletList().run();
        },
      },
      {
        id: 'orderedList',
        group: 'Basic Blocks',
        label: 'Ordered List',
        hint: '⌥⌘O',
        keywords: ['list', 'number', 'ol'],
        run: (instance) => {
          instance.chain().focus().toggleOrderedList().run();
        },
      },
      {
        id: 'table',
        group: 'Advanced Components',
        label: 'Table',
        hint: '⌥⌘T',
        keywords: ['table', 'grid'],
        run: (instance) => {
          instance.chain().focus().insertTable(defaultTableInsert).run();
        },
      },
      {
        id: 'codeBlock',
        group: 'Advanced Components',
        label: 'Code Block',
        hint: '⌥⌘C',
        keywords: ['code', 'pre'],
        run: (instance) => {
          instance.chain().focus().toggleCodeBlock().run();
        },
      },
      {
        id: 'blockquote',
        group: 'Advanced Components',
        label: 'Blockquote',
        hint: '⇧⌘Q',
        keywords: ['quote', 'blockquote'],
        run: (instance) => {
          instance.chain().focus().toggleBlockquote().run();
        },
      },
    ],
    [defaultTableInsert],
  );

  const filteredSlashCommands = useMemo(() => {
    const query = slashState.query.trim().toLowerCase();
    const filtered = !query
      ? slashCommands
      : slashCommands.filter((cmd) => {
          const haystack =
            `${cmd.label} ${cmd.keywords.join(' ')}`.toLowerCase();
          return haystack.includes(query);
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

    const isSlashTriggerChar = (value: string | null | undefined) =>
      value === '/' || value === '／';

    const isInsertTextLikeInput = (inputType: string) =>
      inputType === 'insertText' || inputType === 'insertFromComposition';

    const isSlashTriggerEligible = () => {
      if (!editor.isFocused) return false;
      if (editor.isActive('codeBlock')) return false;
      const { selection } = editor.state;
      if (!selection.empty) return false;
      const parentText = selection.$from.parent.textContent.trim();
      return parentText.length === 0;
    };

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

      if (event.inputType === 'insertFromComposition' && event.data) {
        event.preventDefault();
        appendSlashQuery(event.data);
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

      if (slashState.phase === 'idle' && isSlashTriggerChar(data)) {
        const { selection } = editor.state;
        const parentText = selection.$from.parent.textContent.trim();
        const triggeredByCommittedChar = parentText === data;

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

  const groups = ['Basic Blocks', 'Advanced Components'] as const;

  return (
    <div
      className={`editor-slash-menu ${isOpen ? 'is-open' : ''}`}
      style={{ left: x, top: y }}
    >
      {commands.length === 0 ? (
        <div className="editor-slash-menu__empty">No matching commands</div>
      ) : (
        groups.map((group) => {
          const groupItems = commands.filter((cmd) => cmd.group === group);
          if (groupItems.length === 0) return null;
          return (
            <div key={group}>
              <div className="editor-slash-menu__group">{group}</div>
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
