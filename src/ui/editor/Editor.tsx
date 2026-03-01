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
import { useImagePaste } from './useImagePaste';
import { createHandleDOMEvents } from './pasteHandler';
import {
  createEditorKeyDownHandler,
  createFindReplaceShortcutExtension,
  createToolbarShortcutExtension,
} from './editorExtensions';
import { useTransientStatus } from './useTransientStatus';
import { useInsertTable } from './useInsertTable';
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
  'aria-haspopup="dialog"',
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
  const [isOutlineOpen, setIsOutlineOpen] = useState(true);
  const [bubbleMenuPosition, setBubbleMenuPosition] = useState<{
    open: boolean;
    x: number;
    y: number;
  }>({ open: false, x: 0, y: 0 });
  const bubbleMenuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { statusText, setTransientStatus, setDestructiveStatus } =
    useTransientStatus();
  const insertTable = useInsertTable({ setTransientStatus });

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
    openInsertTablePopover: insertTable.openInsertTablePopover,
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

    const clearBubbleTimer = () => {
      if (bubbleMenuTimerRef.current) {
        clearTimeout(bubbleMenuTimerRef.current);
        bubbleMenuTimerRef.current = null;
      }
    };

    const updateBubble = () => {
      clearBubbleTimer();
      if (editor.state.selection.empty || !editor.isFocused) {
        setBubbleMenuPosition({ open: false, x: 0, y: 0 });
        return;
      }

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        setBubbleMenuPosition({ open: false, x: 0, y: 0 });
        return;
      }

      const rect = selection.getRangeAt(0).getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) {
        setBubbleMenuPosition({ open: false, x: 0, y: 0 });
        return;
      }

      bubbleMenuTimerRef.current = setTimeout(() => {
        setBubbleMenuPosition({
          open: true,
          x: rect.left + rect.width / 2,
          y: rect.top - 8,
        });
      }, BUBBLE_MENU_DEBOUNCE_MS);
    };

    const hideBubble = () => {
      clearBubbleTimer();
      setBubbleMenuPosition({ open: false, x: 0, y: 0 });
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

  if (!activeFile)
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No file open
      </div>
    );
  if (!editor) return null;

  const isToolbarEnabled = hasEditorWidgetFocus && editor.isEditable;
  const toolbarStatus = !hasEditorWidgetFocus
    ? 'Click editor to enable'
    : statusText || 'Ready';
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
        <button
          type="button"
          className="absolute right-3 top-10 z-30 rounded border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
          onClick={() => setIsOutlineOpen((prev) => !prev)}
        >
          {isOutlineOpen ? 'Hide Outline' : 'Show Outline'}
        </button>

        <div className="h-full flex">
          <div className="flex-1 min-w-0">
            <EditorShell
              editor={editor}
              isToolbarEnabled={isToolbarEnabled}
              runToolbarCommand={runToolbarCommand}
              setHasEditorWidgetFocus={setHasEditorWidgetFocus}
              toolbarStatus={toolbarStatus}
              insertTable={insertTable}
              findReplace={findReplace}
              onEditorContextMenu={openEditorContextMenu}
              breadcrumb={
                <Breadcrumb
                  items={breadcrumbItems}
                  onItemClick={handleBreadcrumbClick}
                />
              }
              bubbleMenu={
                <div
                  className={`editor-bubble-menu ${bubbleMenuPosition.open ? 'is-open' : ''}`}
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
            />
          </div>
          <Outline editor={editor} isOpen={isOutlineOpen} />
        </div>
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
