/**
 * Slash Menu Hook
 *
 * Manages slash menu state and event handling using a state machine approach.
 * Separates concerns: state management, event handling, and command filtering.
 */

import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { match } from 'pinyin-pro';
import { t, getLocale } from '../../../../shared/i18n';
import { isStrictSlashTriggerEligible } from './slashEligibility';
import { applyImageAction } from '../../hooks/imageActions';
import {
  isInsertTextLikeInput,
  isSlashTriggerChar,
  type SlashSession,
  type AnchorRect,
  createInitialSlashSession,
  slashReducer,
  isActivePhase,
} from '../../domain';

const SLASH_MENU_MAX_ITEMS = 14;

export type SlashCommand = {
  id: string;
  group: 'basic' | 'advanced';
  label: string;
  hint: string;
  keywords: string[];
  run: (editor: Editor) => void;
};

export type UseSlashMenuOptions = {
  editor: Editor | null;
  defaultTableInsert: { rows: number; cols: number; withHeaderRow: boolean };
  getSafeCoordsAtPos: (
    editor: Editor,
    pos: number,
  ) => { left: number; top: number; bottom: number } | null;
};

export type UseSlashMenuResult = {
  session: SlashSession;
  commands: SlashCommand[];
  selectedIndex: number;
  executeCommand: (command: SlashCommand) => void;
  hoverIndex: (index: number) => void;
};

/**
 * Create the command list
 */
function createSlashCommands(
  defaultTableInsert: UseSlashMenuOptions['defaultTableInsert'],
): SlashCommand[] {
  return [
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
        void applyImageAction(instance);
      },
    },
  ];
}

/**
 * Filter commands based on query
 */
function filterCommands(
  commands: SlashCommand[],
  query: string,
): SlashCommand[] {
  if (!query.trim()) {
    return commands.slice(0, SLASH_MENU_MAX_ITEMS);
  }

  const queryLower = query.toLowerCase();
  const isZhCN = getLocale() === 'zh-CN';

  const filtered = commands.filter((cmd) => {
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
}

/**
 * Main hook for slash menu functionality
 */
export function useSlashMenu({
  editor,
  defaultTableInsert,
  getSafeCoordsAtPos,
}: UseSlashMenuOptions): UseSlashMenuResult {
  // State machine
  const [session, dispatch] = useReducer(
    slashReducer,
    null,
    createInitialSlashSession,
  );
  const composingRef = useRef(false);

  // Commands
  const allCommands = useMemo(
    () => createSlashCommands(defaultTableInsert),
    [defaultTableInsert],
  );
  const commands = useMemo(
    () => filterCommands(allCommands, session.query),
    [allCommands, session.query],
  );

  // Action dispatchers
  const openSlash = useCallback(
    (anchorRect: AnchorRect, source: 'keyboard' | 'ime') => {
      dispatch({ type: 'OPEN', anchorRect, source });
    },
    [],
  );

  const closeSlash = useCallback(() => {
    dispatch({ type: 'CLOSE' });
  }, []);

  const appendQuery = useCallback((char: string) => {
    dispatch({ type: 'APPEND_QUERY', char });
  }, []);

  const deleteQuery = useCallback(() => {
    dispatch({ type: 'DELETE_QUERY' });
  }, []);

  const moveNext = useCallback(() => {
    dispatch({ type: 'MOVE_NEXT', itemCount: commands.length });
  }, [commands.length]);

  const movePrev = useCallback(() => {
    dispatch({ type: 'MOVE_PREV', itemCount: commands.length });
  }, [commands.length]);

  const setSelected = useCallback(
    (index: number) => {
      dispatch({ type: 'SET_SELECTED', index, itemCount: commands.length });
    },
    [commands.length],
  );

  // Command execution
  const executeCommand = useCallback(
    (command: SlashCommand) => {
      if (editor) {
        command.run(editor);
        closeSlash();
      }
    },
    [editor, closeSlash],
  );

  const hoverIndex = useCallback(
    (index: number) => {
      setSelected(index);
    },
    [setSelected],
  );

  // Event handlers
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!editor.isFocused || event.isComposing || composingRef.current) {
        return;
      }

      if (!isActivePhase(session.phase)) {
        return;
      }

      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          event.stopPropagation();
          closeSlash();
          break;
        case 'ArrowDown':
          event.preventDefault();
          event.stopPropagation();
          moveNext();
          break;
        case 'ArrowUp':
          event.preventDefault();
          event.stopPropagation();
          movePrev();
          break;
        case 'Tab':
          event.preventDefault();
          event.stopPropagation();
          moveNext();
          break;
        case 'Backspace':
          event.preventDefault();
          event.stopPropagation();
          deleteQuery();
          break;
        case 'Enter':
          event.preventDefault();
          event.stopPropagation();
          const command = commands[session.selectedIndex];
          if (command) {
            executeCommand(command);
          }
          break;
      }
    };

    const handleBeforeInput = (event: InputEvent) => {
      if (!editor.isFocused) return;

      // Trigger slash menu
      if (!isActivePhase(session.phase)) {
        if (
          isInsertTextLikeInput(event.inputType) &&
          isSlashTriggerChar(event.data)
        ) {
          if (!isStrictSlashTriggerEligible(editor)) {
            return;
          }
          event.preventDefault();
          const { selection } = editor.state;
          const rect = getSafeCoordsAtPos(editor, selection.from);
          if (rect) {
            openSlash(
              { left: rect.left, top: rect.top, bottom: rect.bottom },
              'keyboard',
            );
          }
        }
        return;
      }

      // Handle input during active session
      if (event.isComposing || composingRef.current) {
        return;
      }

      if (event.inputType === 'deleteContentBackward') {
        event.preventDefault();
        deleteQuery();
        return;
      }

      if (isInsertTextLikeInput(event.inputType) && event.data) {
        event.preventDefault();
        appendQuery(event.data);
      }
    };

    const handleCompositionStart = () => {
      composingRef.current = true;
    };

    const handleCompositionEnd = (event: CompositionEvent) => {
      composingRef.current = false;
      if (!editor.isFocused) return;

      const data = event.data ?? '';

      // Handle during active session
      if (isActivePhase(session.phase)) {
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
          appendQuery(data);
        }
        return;
      }

      // Trigger via IME
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

        if (
          !isStrictSlashTriggerEligible(editor) &&
          !triggeredByCommittedChar
        ) {
          return;
        }

        if (triggeredByCommittedChar && selection.from > 0) {
          editor
            .chain()
            .focus()
            .deleteRange({ from: selection.from - 1, to: selection.from })
            .run();
        }

        const rect = getSafeCoordsAtPos(editor, selection.from);
        if (rect) {
          openSlash(
            { left: rect.left, top: rect.top, bottom: rect.bottom },
            'ime',
          );
        }
      }
    };

    const handlePointerDown = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('.editor-slash-menu')) {
        return;
      }
      closeSlash();
    };
    const handleBlur = () => {
      closeSlash();
    };

    let dom: HTMLElement | null = null;
    try {
      dom = editor.view.dom as HTMLElement;
    } catch {
      return;
    }
    if (!dom) return;

    dom.addEventListener('keydown', handleKeyDown, true);
    dom.addEventListener('beforeinput', handleBeforeInput as EventListener);
    dom.addEventListener('compositionstart', handleCompositionStart);
    dom.addEventListener('compositionend', handleCompositionEnd as EventListener);
    window.addEventListener('mousedown', handlePointerDown);
    editor.on('blur', handleBlur);

    return () => {
      dom?.removeEventListener('keydown', handleKeyDown, true);
      dom?.removeEventListener(
        'beforeinput',
        handleBeforeInput as EventListener,
      );
      dom?.removeEventListener('compositionstart', handleCompositionStart);
        dom?.removeEventListener(
          'compositionend',
          handleCompositionEnd as EventListener,
        );
      window.removeEventListener('mousedown', handlePointerDown);
      editor.off('blur', handleBlur);
    };
  }, [
    editor,
    session.phase,
    session.selectedIndex,
    commands,
    getSafeCoordsAtPos,
    openSlash,
    closeSlash,
    appendQuery,
    deleteQuery,
    moveNext,
    movePrev,
    executeCommand,
  ]);

  return {
    session,
    commands,
    selectedIndex: session.selectedIndex,
    executeCommand,
    hoverIndex,
  };
}
