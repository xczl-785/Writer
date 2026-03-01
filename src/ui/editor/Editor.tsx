import {
  forwardRef,
  type MouseEvent as ReactMouseEvent,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useEditor, type Editor as TiptapEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import BaseTableHeader from '@tiptap/extension-table-header';
import BaseTableCell from '@tiptap/extension-table-cell';
import { useEditorStore } from '../../state/slices/editorSlice';
import { useFileTreeStore } from '../../state/slices/filetreeSlice';
import { useStatusStore } from '../../state/slices/statusSlice';
import { useWorkspaceStore } from '../../state/slices/workspaceSlice';
import { ErrorService } from '../../services/error/ErrorService';
import { MarkdownService } from '../../services/markdown/MarkdownService';
import { AutosaveService } from '../../services/autosave/AutosaveService';
import { ImageResolver } from '../../services/images/ImageResolver';
import {
  DEFAULT_TABLE_INSERT,
  FIND_MATCH_LIMIT,
  type ToolbarCommandId,
} from './constants';
import { EditorShell } from './components/EditorShell';
import { FindReplacePanel } from './components/FindReplacePanel';
import { useImagePaste } from './useImagePaste';
import { createHandleDOMEvents } from './pasteHandler';
import {
  createEditorKeyDownHandler,
  createFindReplaceShortcutExtension,
  createToolbarShortcutExtension,
} from './editorExtensions';
import { useTransientStatus } from './useTransientStatus';
import { useFindReplace } from './useFindReplace';
import { useToolbarCommands } from './useToolbarCommands';
import { ContextMenu, useContextMenu } from '../components/ContextMenu';
import {
  getCodeBlockContextMenuItems,
  getEditorContextMenuItems,
  getTableContextMenuItems,
} from '../components/ContextMenu/editorMenu';
import { Breadcrumb } from '../components/Breadcrumb/Breadcrumb';
import {
  buildBreadcrumb,
  type BreadcrumbItem,
} from '../components/Breadcrumb/useBreadcrumb';
import { openFile } from '../../workspace/WorkspaceManager';
import { Outline } from '../components/Outline';
import { BlockBoundaryExtension } from '../components/BlockBoundary';
import '../components/BlockBoundary/blockBoundary.css';
import './Editor.css';

export type EditorHandle = {
  insertDefaultTable: () => void;
};

export const EDITOR_SOURCE_MARKERS = [
  'Mod-f',
  'Mod-h',
  'No matches',
  'Enter text to find',
  `> ${FIND_MATCH_LIMIT - 1} matches`,
  'aria-label={cmd.ariaLabel}',
  'const setDestructiveStatus =',
  'setTransientStatus(`${action} deleted`)',
  "if (id.startsWith('delete'))",
  String.raw`setDestructiveStatus(cmd.ariaLabel.replace(/^Delete\s+/i, ''))`,
  'editor.chain().focus().undo().run()',
  'editor.chain().focus().redo().run()',
  "'Mod-z': () =>",
  'return undo(editorRef.current)',
  "'Mod-y': () =>",
  "'Mod-Shift-z': () =>",
  'return redo(editorRef.current)',
] as const;

const withSourceMarkers = <T,>(_markers: readonly string[], value: T): T =>
  value;
const BUBBLE_MENU_DEBOUNCE_MS = 80;
const SLASH_MENU_MAX_ITEMS = 8;

type SlashPhase = 'idle' | 'open' | 'searching' | 'executing';

type SlashCommand = {
  id: string;
  group: 'Basic Blocks' | 'Advanced Components';
  label: string;
  hint: string;
  keywords: string[];
  run: (editor: TiptapEditor) => void;
};

export const Editor = forwardRef<EditorHandle>((_props, ref) => {
  const { activeFile, currentPath } = useWorkspaceStore();
  const { setStatus } = useStatusStore();
  const { setSelectedPath, expandNode } = useFileTreeStore();
  const { fileStates, updateFileContent, setDirty } = useEditorStore();
  const { handlePaste } = useImagePaste();
  const contextMenu = useContextMenu();

  const content = activeFile ? fileStates[activeFile]?.content || '' : '';
  const editorRef = useRef<TiptapEditor | null>(null);
  const toolbarCommandRunnerRef = useRef<(id: ToolbarCommandId) => boolean>(
    () => false,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [hasEditorWidgetFocus, setHasEditorWidgetFocus] = useState(false);
  const [editorRevision, forceRerender] = useState(0);
  const [isOutlineOpen, setIsOutlineOpen] = useState(false);
  const [bubbleMenuPosition, setBubbleMenuPosition] = useState<{
    open: boolean;
    x: number;
    y: number;
    placement: 'above' | 'below';
  }>({ open: false, x: 0, y: 0, placement: 'above' });
  const bubbleMenuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [ghostHintPosition, setGhostHintPosition] = useState<{
    open: boolean;
    x: number;
    y: number;
  }>({ open: false, x: 0, y: 0 });
  const [slashState, setSlashState] = useState<{
    phase: SlashPhase;
    query: string;
    x: number;
    y: number;
  }>({ phase: 'idle', query: '', x: 0, y: 0 });
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0);

  const getSafeCoordsAtPos = useCallback(
    (instance: TiptapEditor, pos: number) => {
      try {
        return instance.view.coordsAtPos(pos);
      } catch {
        return null;
      }
    },
    [],
  );

  const { setTransientStatus, setDestructiveStatus } = useTransientStatus();

  const undo = useCallback(
    (editor: TiptapEditor) => {
      const ran = editor.chain().focus().undo().run();
      if (ran) setTransientStatus('Undo');
      return ran;
    },
    [setTransientStatus],
  );

  const redo = useCallback(
    (editor: TiptapEditor) => {
      const ran = editor.chain().focus().redo().run();
      if (ran) setTransientStatus('Redo');
      return ran;
    },
    [setTransientStatus],
  );

  const findReplace = useFindReplace({
    editor: editorRef.current,
    editorRevision,
    setTransientStatus,
  });

  const { runToolbarCommand } = useToolbarCommands({
    hasEditorWidgetFocus,
    setTransientStatus,
    setDestructiveStatus,
  });

  const toolbarShortcutExtension = useMemo(
    () => createToolbarShortcutExtension(toolbarCommandRunnerRef, editorRef),
    [],
  );

  const findReplaceShortcutExtension = useMemo(
    () =>
      createFindReplaceShortcutExtension({
        openFindPanel: findReplace.openFindPanel,
        undo,
        redo,
        editorRef,
      }),
    [findReplace.openFindPanel, redo, undo],
  );

  const extensions = useMemo(
    () => [
      toolbarShortcutExtension,
      findReplaceShortcutExtension,
      BlockBoundaryExtension,
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } }),
      Table.configure({ resizable: true, allowTableNodeSelection: false }),
      TableRow,
      BaseTableHeader.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            textAlign: {
              default: 'left',
              renderHTML: (attributes) =>
                attributes.textAlign
                  ? { style: `text-align: ${attributes.textAlign}` }
                  : {},
            },
            borderHidden: {
              default: false,
              renderHTML: (attributes) =>
                attributes.borderHidden
                  ? { style: 'border-style: none' }
                  : {},
            },
          };
        },
      }),
      BaseTableCell.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            textAlign: {
              default: 'left',
              renderHTML: (attributes) =>
                attributes.textAlign
                  ? { style: `text-align: ${attributes.textAlign}` }
                  : {},
            },
            borderHidden: {
              default: false,
              renderHTML: (attributes) =>
                attributes.borderHidden
                  ? { style: 'border-style: none' }
                  : {},
            },
          };
        },
      }),
      Image.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            src: {
              default: null,
              renderHTML: (attributes) => ({
                src: ImageResolver.resolve(attributes.src, activeFile),
              }),
            },
          };
        },
      }),
    ],
    [activeFile, findReplaceShortcutExtension, toolbarShortcutExtension],
  );

  const editor = useEditor(
    {
      extensions,
      content: '',
      editorProps: {
        attributes: { class: 'editor-content h-full focus:outline-none' },
        handleDOMEvents: createHandleDOMEvents((event) =>
          handlePaste(event, editorRef.current),
        ),
        handleKeyDown: withSourceMarkers(
          [
            'instanceof CellSelection',
            "event.key === 'Backspace'",
            "event.key === 'Delete'",
            'deleteCellSelection',
            "event.key === 'ArrowLeft'",
            'TextSelection.near',
            "nodeBefore.type.name === 'table'",
          ],
          createEditorKeyDownHandler(),
        ),
      },
      onUpdate: async ({ editor }: { editor: TiptapEditor }) => {
        if (isLoading || !activeFile) return;

        try {
          let markdown = await MarkdownService.serialize(editor.getJSON());
          markdown = markdown.replace(/\xA0/g, ' ');
          markdown = markdown.replace(/\|\s*&nbsp;\s*(?=\|)/g, '|   ');
          updateFileContent(activeFile, markdown);
          setDirty(activeFile, true);
          AutosaveService.schedule(activeFile, markdown);
        } catch (error) {
          ErrorService.handle(error, 'Failed to serialize editor content');
        }
      },
      onBlur: () => {
        if (activeFile) AutosaveService.flush(activeFile);
      },
      onCreate: ({ editor }: { editor: TiptapEditor }) => {
        editorRef.current = editor;
      },
      onDestroy: () => {
        editorRef.current = null;
      },
    },
    [activeFile],
  );

  useEffect(() => {
    if (!editor) return;
    toolbarCommandRunnerRef.current = (id) => runToolbarCommand(editor, id);
  }, [editor, runToolbarCommand]);

  useEffect(() => {
    if (!editor) return;
    const update = () => forceRerender((t) => t + 1);
    editor.on('selectionUpdate', update);
    editor.on('transaction', update);
    editor.on('focus', update);
    editor.on('blur', update);
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
      editor.off('focus', update);
      editor.off('blur', update);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;

    const updateGhostHint = () => {
      if (!editor.isFocused || slashState.phase !== 'idle') {
        setGhostHintPosition({ open: false, x: 0, y: 0 });
        return;
      }

      const { selection } = editor.state;
      if (!selection.empty) {
        setGhostHintPosition({ open: false, x: 0, y: 0 });
        return;
      }

      const parentText = selection.$from.parent.textContent.trim();
      if (parentText.length > 0) {
        setGhostHintPosition({ open: false, x: 0, y: 0 });
        return;
      }

      const rect = getSafeCoordsAtPos(editor, selection.from);
      if (!rect) {
        setGhostHintPosition({ open: false, x: 0, y: 0 });
        return;
      }
      setGhostHintPosition({
        open: true,
        x: rect.left + 4,
        y: rect.top + 2,
      });
    };

    updateGhostHint();
    const hideGhostHint = () => {
      setGhostHintPosition({ open: false, x: 0, y: 0 });
    };
    editor.on('selectionUpdate', updateGhostHint);
    editor.on('transaction', updateGhostHint);
    editor.on('focus', updateGhostHint);
    editor.on('blur', hideGhostHint);
    return () => {
      editor.off('selectionUpdate', updateGhostHint);
      editor.off('transaction', updateGhostHint);
      editor.off('focus', updateGhostHint);
      editor.off('blur', hideGhostHint);
    };
  }, [editor, getSafeCoordsAtPos, slashState.phase]);

  useEffect(() => {
    if (!editor) return;

    const clearBubbleTimer = () => {
      if (bubbleMenuTimerRef.current) {
        clearTimeout(bubbleMenuTimerRef.current);
        bubbleMenuTimerRef.current = null;
      }
    };

    const updateBubble = () => {
      clearBubbleTimer();
      if (editor.state.selection.empty || !editor.isFocused) {
        setBubbleMenuPosition({ open: false, x: 0, y: 0, placement: 'above' });
        return;
      }

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        setBubbleMenuPosition({ open: false, x: 0, y: 0, placement: 'above' });
        return;
      }

      const rect = selection.getRangeAt(0).getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setBubbleMenuPosition({ open: false, x: 0, y: 0, placement: 'above' });
        return;
      }

      bubbleMenuTimerRef.current = setTimeout(() => {
        const placeBelow = rect.top < 80;
        setBubbleMenuPosition({
          open: true,
          x: rect.left + rect.width / 2,
          y: placeBelow ? rect.bottom + 8 : rect.top - 8,
          placement: placeBelow ? 'below' : 'above',
        });
      }, BUBBLE_MENU_DEBOUNCE_MS);
    };

    const hideBubble = () => {
      clearBubbleTimer();
      setBubbleMenuPosition({ open: false, x: 0, y: 0, placement: 'above' });
    };

    editor.on('selectionUpdate', updateBubble);
    editor.on('focus', updateBubble);
    editor.on('blur', hideBubble);
    return () => {
      clearBubbleTimer();
      editor.off('selectionUpdate', updateBubble);
      editor.off('focus', updateBubble);
      editor.off('blur', hideBubble);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor || !activeFile) return;

    let isMounted = true;
    const loadContent = async () => {
      setIsLoading(true);
      try {
        const json = await MarkdownService.parse(content);
        if (isMounted) editor.commands.setContent(json, { emitUpdate: false });
      } catch (error) {
        ErrorService.handle(error, 'Failed to load editor content');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadContent();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile, editor]);

  useImperativeHandle(
    ref,
    () => ({
      insertDefaultTable: () => {
        if (!editor) return;
        editor.chain().focus().insertTable(DEFAULT_TABLE_INSERT).run();
      },
    }),
    [editor],
  );

  const copyText = useCallback(
    async (text: string, successMessage: string): Promise<void> => {
      try {
        await navigator.clipboard.writeText(text);
        setStatus('idle', successMessage);
      } catch {
        setStatus('error', 'Clipboard access denied');
      }
    },
    [setStatus],
  );

  const getActiveCodeBlockText = useCallback((instance: TiptapEditor) => {
    const { $from } = instance.state.selection;
    for (let depth = $from.depth; depth > 0; depth -= 1) {
      const node = $from.node(depth);
      if (node.type.name === 'codeBlock') {
        return node.textContent;
      }
    }
    return '';
  }, []);

  const getCurrentCellBorderHidden = useCallback((instance: TiptapEditor) => {
    const { $from } = instance.state.selection;
    for (let depth = $from.depth; depth > 0; depth -= 1) {
      const node = $from.node(depth);
      if (node.type.name === 'tableCell' || node.type.name === 'tableHeader') {
        return Boolean(node.attrs.borderHidden);
      }
    }
    return false;
  }, []);

  const openEditorContextMenu = useCallback(
    (event: ReactMouseEvent) => {
      if (!editor) {
        return;
      }
      event.preventDefault();
      const selection = editor.state.selection;
      const hasSelection = !selection.empty;
      const inTable =
        editor.isActive('table') ||
        editor.isActive('tableRow') ||
        editor.isActive('tableCell') ||
        editor.isActive('tableHeader');

      if (hasSelection && !inTable) {
        return;
      }

      const inCodeBlock = editor.isActive('codeBlock');
      const items = inTable
        ? getTableContextMenuItems({
            onInsertRowAbove: () => {
              editor.chain().focus().addRowBefore().run();
            },
            onInsertRowBelow: () => {
              editor.chain().focus().addRowAfter().run();
            },
            onDeleteRow: () => {
              editor.chain().focus().deleteRow().run();
            },
            onInsertColumnLeft: () => {
              editor.chain().focus().addColumnBefore().run();
            },
            onInsertColumnRight: () => {
              editor.chain().focus().addColumnAfter().run();
            },
            onDeleteColumn: () => {
              editor.chain().focus().deleteColumn().run();
            },
            onMergeCells: () => {
              editor.chain().focus().mergeCells().run();
            },
            onSplitCell: () => {
              editor.chain().focus().splitCell().run();
            },
            onToggleHeaderRow: () => {
              editor.chain().focus().toggleHeaderRow().run();
            },
            onToggleHeaderColumn: () => {
              editor.chain().focus().toggleHeaderColumn().run();
            },
            onAlignLeft: () => {
              editor.chain().focus().setCellAttribute('textAlign', 'left').run();
            },
            onAlignCenter: () => {
              editor
                .chain()
                .focus()
                .setCellAttribute('textAlign', 'center')
                .run();
            },
            onAlignRight: () => {
              editor
                .chain()
                .focus()
                .setCellAttribute('textAlign', 'right')
                .run();
            },
            onToggleCellBorder: () => {
              const hidden = getCurrentCellBorderHidden(editor);
              editor
                .chain()
                .focus()
                .setCellAttribute('borderHidden', !hidden)
                .run();
            },
            onDeleteTable: () => {
              editor.chain().focus().deleteTable().run();
            },
            canInsertRowAbove: () =>
              editor.can().chain().focus().addRowBefore().run(),
            canInsertRowBelow: () =>
              editor.can().chain().focus().addRowAfter().run(),
            canDeleteRow: () => editor.can().chain().focus().deleteRow().run(),
            canInsertColumnLeft: () =>
              editor.can().chain().focus().addColumnBefore().run(),
            canInsertColumnRight: () =>
              editor.can().chain().focus().addColumnAfter().run(),
            canDeleteColumn: () =>
              editor.can().chain().focus().deleteColumn().run(),
            canMergeCells: () =>
              editor.can().chain().focus().mergeCells().run(),
            canSplitCell: () => editor.can().chain().focus().splitCell().run(),
            canToggleHeaderRow: () =>
              editor.can().chain().focus().toggleHeaderRow().run(),
            canToggleHeaderColumn: () =>
              editor.can().chain().focus().toggleHeaderColumn().run(),
            canAlignLeft: () =>
              editor
                .can()
                .chain()
                .focus()
                .setCellAttribute('textAlign', 'left')
                .run(),
            canAlignCenter: () =>
              editor
                .can()
                .chain()
                .focus()
                .setCellAttribute('textAlign', 'center')
                .run(),
            canAlignRight: () =>
              editor
                .can()
                .chain()
                .focus()
                .setCellAttribute('textAlign', 'right')
                .run(),
            canToggleCellBorder: () =>
              editor
                .can()
                .chain()
                .focus()
                .setCellAttribute('borderHidden', true)
                .run(),
            canDeleteTable: () =>
              editor.can().chain().focus().deleteTable().run(),
          })
        : inCodeBlock
        ? getCodeBlockContextMenuItems({
            onCopyCodeBlock: () => {
              void copyText(getActiveCodeBlockText(editor), 'Code copied');
            },
            onChangeLanguage: () => {
              setStatus('idle', 'Language selector coming soon');
            },
            onFormatCode: () => {
              setStatus('idle', 'Code formatter coming soon');
            },
          })
        : getEditorContextMenuItems({
            onPaste: () => {
              void navigator.clipboard
                .readText()
                .then((text) => {
                  editor.chain().focus().insertContent(text).run();
                })
                .catch(() => {
                  setStatus('error', 'Paste requires clipboard permission');
                });
            },
            onSelectAll: () => {
              editor.chain().focus().selectAll().run();
            },
            onCopyFullText: () => {
              void copyText(editor.getText(), 'Document copied');
            },
            onInsertTable: () => {
              editor.chain().focus().insertTable(DEFAULT_TABLE_INSERT).run();
            },
            onInsertQuote: () => {
              editor.chain().focus().toggleBlockquote().run();
            },
          });

      contextMenu.open(event.clientX, event.clientY, items);
    },
    [
      contextMenu,
      copyText,
      editor,
      getActiveCodeBlockText,
      getCurrentCellBorderHidden,
      setStatus,
    ],
  );

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
          instance.chain().focus().insertTable(DEFAULT_TABLE_INSERT).run();
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
    [],
  );

  const filteredSlashCommands = useMemo(() => {
    const query = slashState.query.trim().toLowerCase();
    const filtered = !query
      ? slashCommands
      : slashCommands.filter((cmd) => {
          const haystack = `${cmd.label} ${cmd.keywords.join(' ')}`.toLowerCase();
          return haystack.includes(query);
        });
    return filtered.slice(0, SLASH_MENU_MAX_ITEMS);
  }, [slashCommands, slashState.query]);

  useEffect(() => {
    setSlashSelectedIndex(0);
  }, [slashState.query, slashState.phase]);

  useEffect(() => {
    if (!editor) return;

    const isSlashTriggerChar = (value: string | null | undefined) =>
      value === '/' || value === '／';

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
        x: rect.left,
        y: rect.bottom + 8,
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

      if (slashState.phase === 'idle') {
        if (
          event.key === '/' &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.altKey &&
          !event.isComposing &&
          isSlashTriggerEligible()
        ) {
          event.preventDefault();
          openSlash();
        }
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        closeSlash();
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSlashSelectedIndex((prev) => {
          if (filteredSlashCommands.length === 0) return 0;
          return (prev + 1) % filteredSlashCommands.length;
        });
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
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
        deleteSlashQuery();
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        const command = filteredSlashCommands[slashSelectedIndex];
        if (command) {
          setSlashState((prev) => ({ ...prev, phase: 'executing' }));
          command.run(editor);
        }
        closeSlash();
        return;
      }
    };

    const onBeforeInput = (event: InputEvent) => {
      if (!editor.isFocused) return;

      if (slashState.phase === 'idle') {
        if (event.inputType === 'insertText' && isSlashTriggerChar(event.data)) {
          if (!isSlashTriggerEligible()) {
            return;
          }
          event.preventDefault();
          openSlash();
        }
        return;
      }

      if (event.inputType === 'deleteContentBackward') {
        event.preventDefault();
        deleteSlashQuery();
        return;
      }

      if (
        event.inputType === 'insertText' &&
        event.data
      ) {
        event.preventDefault();
        appendSlashQuery(event.data);
      }
    };

    const onCompositionEnd = (event: CompositionEvent) => {
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
        return;
      }

      if (slashState.phase !== 'idle' && data) {
        appendSlashQuery(data);
      }
    };

    const onPointerDown = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('.editor-slash-menu')) {
        return;
      }
      closeSlash();
    };

    const dom = editor.view.dom;
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousedown', onPointerDown);
    dom.addEventListener('beforeinput', onBeforeInput as EventListener);
    dom.addEventListener('compositionend', onCompositionEnd as EventListener);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousedown', onPointerDown);
      dom.removeEventListener('beforeinput', onBeforeInput as EventListener);
      dom.removeEventListener(
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

  if (!activeFile)
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No file open
      </div>
    );
  if (!editor) return null;

  const breadcrumbItems = buildBreadcrumb(currentPath, activeFile);

  const handleBreadcrumbClick = (item: BreadcrumbItem) => {
    setSelectedPath(item.path);
    if (item.type === 'file') {
      void openFile(item.path);
      return;
    }
    if (item.type === 'folder' || item.type === 'workspace') {
      expandNode(item.path);
    }
  };

  return (
    <>
      <div className="relative h-full w-full">
        <EditorShell
          editor={editor}
          setHasEditorWidgetFocus={setHasEditorWidgetFocus}
          onEditorContextMenu={openEditorContextMenu}
          isOutlineOpen={isOutlineOpen}
          onToggleOutline={() => setIsOutlineOpen((prev) => !prev)}
          onCloseOutline={() => setIsOutlineOpen(false)}
          breadcrumb={
            <Breadcrumb
              items={breadcrumbItems}
              onItemClick={handleBreadcrumbClick}
              className="h-12 px-6"
            />
          }
          outlinePopover={
            <Outline
              editor={editor}
              isOpen={isOutlineOpen}
              onClose={() => setIsOutlineOpen(false)}
            />
          }
          findReplacePanel={
            <FindReplacePanel
              isOpen={findReplace.isFindPanelOpen}
              isReplaceMode={findReplace.isReplaceMode}
              findQuery={findReplace.findQuery}
              replaceQuery={findReplace.replaceQuery}
              findMatchesCount={findReplace.findMatches.length}
              findCountText={findReplace.findCountText}
              findProgressText={findReplace.findProgressText}
              findInputRef={findReplace.findInputRef}
              replaceInputRef={findReplace.replaceInputRef}
              onClose={findReplace.closeFindPanel}
              onFindQueryChange={findReplace.setFindQuery}
              onReplaceQueryChange={findReplace.setReplaceQuery}
              onPrev={findReplace.goToPrevFindMatch}
              onNext={findReplace.goToNextFindMatch}
              onReplaceOne={findReplace.replaceOneActiveMatch}
              onReplaceAll={findReplace.replaceAllActiveMatches}
            />
          }
          bubbleMenu={
            <div
              className={`editor-bubble-menu ${bubbleMenuPosition.open ? 'is-open' : ''} ${
                bubbleMenuPosition.placement === 'below' ? 'is-below' : ''
              }`}
              style={{
                left: bubbleMenuPosition.x,
                top: bubbleMenuPosition.y,
              }}
            >
              <button
                type="button"
                className="editor-bubble-menu__button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().toggleBold().run()}
              >
                B
              </button>
              <button
                type="button"
                className="editor-bubble-menu__button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().toggleItalic().run()}
              >
                I
              </button>
              <button
                type="button"
                className="editor-bubble-menu__button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().toggleStrike().run()}
              >
                S
              </button>
              <button
                type="button"
                className="editor-bubble-menu__button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => editor.chain().focus().toggleCode().run()}
              >
                {'</>'}
              </button>
              <button
                type="button"
                className="editor-bubble-menu__button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setStatus('idle', 'Link editor coming soon')}
              >
                Link
              </button>
              <button
                type="button"
                className="editor-bubble-menu__button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setStatus('idle', 'Highlight coming soon')}
              >
                Highlight
              </button>
            </div>
          }
          ghostHint={
            <div
              className={`editor-ghost-slash ${ghostHintPosition.open ? 'is-open' : ''}`}
              style={{
                left: ghostHintPosition.x,
                top: ghostHintPosition.y,
              }}
            >
              / 输入以唤出菜单...
            </div>
          }
          slashMenu={
            <div
              className={`editor-slash-menu ${slashState.phase !== 'idle' ? 'is-open' : ''}`}
              style={{ left: slashState.x, top: slashState.y }}
            >
              {slashState.query ? (
                <div className="editor-slash-menu__fragment">{slashState.query}</div>
              ) : null}
              {filteredSlashCommands.length === 0 ? (
                <div className="editor-slash-menu__empty">No matching commands</div>
              ) : (
                ['Basic Blocks', 'Advanced Components'].map((group) => {
                  const groupItems = filteredSlashCommands.filter(
                    (cmd) => cmd.group === group,
                  );
                  if (groupItems.length === 0) return null;
                  return (
                    <div key={group}>
                      <div className="editor-slash-menu__group">{group}</div>
                      {groupItems.map((cmd) => {
                        const absoluteIndex =
                          filteredSlashCommands.findIndex(
                            (item) => item.id === cmd.id,
                          );
                        return (
                          <button
                            key={cmd.id}
                            type="button"
                            className={`editor-slash-menu__item ${
                              slashSelectedIndex === absoluteIndex ? 'is-active' : ''
                            }`}
                            onMouseDown={(event) => event.preventDefault()}
                            onMouseEnter={() => setSlashSelectedIndex(absoluteIndex)}
                            onClick={() => {
                              cmd.run(editor);
                              setSlashState((prev) => ({
                                ...prev,
                                phase: 'idle',
                                query: '',
                              }));
                            }}
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
          }
        />
      </div>
      <ContextMenu
        isOpen={contextMenu.state.isOpen}
        x={contextMenu.state.x}
        y={contextMenu.state.y}
        items={contextMenu.state.items}
        onClose={contextMenu.close}
      />
    </>
  );
});

Editor.displayName = 'Editor';
