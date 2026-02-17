import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useCallback,
  useRef,
  useState,
} from 'react';
import {
  useEditor,
  EditorContent,
  Editor as TiptapEditor,
} from '@tiptap/react';
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { useEditorStore } from '../../state/slices/editorSlice';
import { useWorkspaceStore } from '../../state/slices/workspaceSlice';
import { MarkdownService } from '../../services/markdown/MarkdownService';
import { AutosaveService } from '../../services/autosave/AutosaveService';
import { ImageResolver } from '../../services/images/ImageResolver';
import { useImagePaste } from './useImagePaste';
import { createHandleDOMEvents } from './pasteHandler';
import './Editor.css';

type ToolbarCommandId =
  | 'bold'
  | 'italic'
  | 'inlineCode'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bulletList'
  | 'orderedList'
  | 'blockquote'
  | 'codeBlock'
  | 'insertTable'
  | 'addTableRow'
  | 'deleteTableRow'
  | 'addTableColumn'
  | 'deleteTableColumn';

type ToolbarCommandSpec = {
  id: ToolbarCommandId;
  label: string;
  ariaLabel: string;
  shortcut: string;
  isActive: (editor: TiptapEditor) => boolean;
  canRun: (editor: TiptapEditor) => boolean;
  run: (editor: TiptapEditor) => boolean;
};

const TOOLBAR_COMMANDS: readonly ToolbarCommandSpec[] = [
  {
    id: 'bold',
    label: 'B',
    ariaLabel: 'Bold',
    shortcut: 'Mod-b',
    isActive: (editor) => editor.isActive('bold'),
    canRun: (editor) => editor.can().chain().focus().toggleBold().run(),
    run: (editor) => editor.chain().focus().toggleBold().run(),
  },
  {
    id: 'italic',
    label: 'I',
    ariaLabel: 'Italic',
    shortcut: 'Mod-i',
    isActive: (editor) => editor.isActive('italic'),
    canRun: (editor) => editor.can().chain().focus().toggleItalic().run(),
    run: (editor) => editor.chain().focus().toggleItalic().run(),
  },
  {
    id: 'inlineCode',
    label: '</>',
    ariaLabel: 'Inline code',
    shortcut: 'Mod-e',
    isActive: (editor) => editor.isActive('code'),
    canRun: (editor) => editor.can().chain().focus().toggleCode().run(),
    run: (editor) => editor.chain().focus().toggleCode().run(),
  },
  {
    id: 'heading1',
    label: 'H1',
    ariaLabel: 'Heading 1',
    shortcut: 'Mod-Alt-1',
    isActive: (editor) => editor.isActive('heading', { level: 1 }),
    canRun: (editor) =>
      editor.can().chain().focus().toggleHeading({ level: 1 }).run(),
    run: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: 'heading2',
    label: 'H2',
    ariaLabel: 'Heading 2',
    shortcut: 'Mod-Alt-2',
    isActive: (editor) => editor.isActive('heading', { level: 2 }),
    canRun: (editor) =>
      editor.can().chain().focus().toggleHeading({ level: 2 }).run(),
    run: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: 'heading3',
    label: 'H3',
    ariaLabel: 'Heading 3',
    shortcut: 'Mod-Alt-3',
    isActive: (editor) => editor.isActive('heading', { level: 3 }),
    canRun: (editor) =>
      editor.can().chain().focus().toggleHeading({ level: 3 }).run(),
    run: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: 'bulletList',
    label: 'Bul',
    ariaLabel: 'Bullet list',
    shortcut: 'Mod-Alt-b',
    isActive: (editor) => editor.isActive('bulletList'),
    canRun: (editor) => editor.can().chain().focus().toggleBulletList().run(),
    run: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'orderedList',
    label: 'Num',
    ariaLabel: 'Ordered list',
    shortcut: 'Mod-Alt-o',
    isActive: (editor) => editor.isActive('orderedList'),
    canRun: (editor) => editor.can().chain().focus().toggleOrderedList().run(),
    run: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: 'blockquote',
    label: 'Quote',
    ariaLabel: 'Blockquote',
    shortcut: 'Mod-Alt-q',
    isActive: (editor) => editor.isActive('blockquote'),
    canRun: (editor) => editor.can().chain().focus().toggleBlockquote().run(),
    run: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    id: 'codeBlock',
    label: 'Block',
    ariaLabel: 'Code block',
    shortcut: 'Mod-Alt-c',
    isActive: (editor) => editor.isActive('codeBlock'),
    canRun: (editor) => editor.can().chain().focus().toggleCodeBlock().run(),
    run: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: 'insertTable',
    label: 'Tbl',
    ariaLabel: 'Insert table',
    shortcut: 'Mod-t',
    isActive: (editor) => editor.isActive('table'),
    canRun: (editor) =>
      editor
        .can()
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
    run: (editor) =>
      editor
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
  {
    id: 'addTableRow',
    label: '+R',
    ariaLabel: 'Add row',
    shortcut: '',
    isActive: () => false,
    canRun: (editor) => editor.can().chain().focus().addRowAfter().run(),
    run: (editor) => editor.chain().focus().addRowAfter().run(),
  },
  {
    id: 'deleteTableRow',
    label: '-R',
    ariaLabel: 'Delete row',
    shortcut: '',
    isActive: () => false,
    canRun: (editor) => editor.can().chain().focus().deleteRow().run(),
    run: (editor) => editor.chain().focus().deleteRow().run(),
  },
  {
    id: 'addTableColumn',
    label: '+C',
    ariaLabel: 'Add column',
    shortcut: '',
    isActive: () => false,
    canRun: (editor) => editor.can().chain().focus().addColumnAfter().run(),
    run: (editor) => editor.chain().focus().addColumnAfter().run(),
  },
  {
    id: 'deleteTableColumn',
    label: '-C',
    ariaLabel: 'Delete column',
    shortcut: '',
    isActive: () => false,
    canRun: (editor) => editor.can().chain().focus().deleteColumn().run(),
    run: (editor) => editor.chain().focus().deleteColumn().run(),
  },
] as const;

export type EditorHandle = {
  insertDefaultTable: () => void;
};

export const Editor = forwardRef<EditorHandle>((_props, ref) => {
  const { activeFile } = useWorkspaceStore();
  const { fileStates, updateFileContent, setDirty } = useEditorStore();
  const { handlePaste } = useImagePaste();
  const editorRef = useRef<TiptapEditor | null>(null);
  const toolbarCommandRunnerRef = useRef<(id: ToolbarCommandId) => boolean>(
    () => false,
  );
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Local state to track if content is loading to avoid race conditions
  const [isLoading, setIsLoading] = useState(false);
  const [hasEditorWidgetFocus, setHasEditorWidgetFocus] = useState(false);
  const [statusText, setStatusText] = useState<string>('');
  const [isInsertTablePopoverOpen, setIsInsertTablePopoverOpen] =
    useState(false);
  const [insertTableRows, setInsertTableRows] = useState('3');
  const [insertTableCols, setInsertTableCols] = useState('3');
  const insertTableRowsInputRef = useRef<HTMLInputElement | null>(null);
  const [, forceRerender] = useState(0);

  const content = activeFile ? fileStates[activeFile]?.content || '' : '';

  const toolbarCommandById = useMemo(() => {
    const map = new Map<ToolbarCommandId, ToolbarCommandSpec>();
    for (const cmd of TOOLBAR_COMMANDS) map.set(cmd.id, cmd);
    return map;
  }, []);

  const setTransientStatus = useCallback((next: string) => {
    setStatusText(next);
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
    }
    statusTimeoutRef.current = setTimeout(() => {
      setStatusText('');
    }, 1500);
  }, []);

  const clampTableDim = useCallback((value: string) => {
    const parsed = Number.parseInt(value, 10);
    const fallback = 3;
    const min = 1;
    const max = 20;
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(max, Math.max(min, parsed));
  }, []);

  const openInsertTablePopover = useCallback(() => {
    setInsertTableRows('3');
    setInsertTableCols('3');
    setIsInsertTablePopoverOpen(true);
  }, []);

  const closeInsertTablePopover = useCallback(() => {
    setIsInsertTablePopoverOpen(false);
  }, []);

  const confirmInsertTable = useCallback(
    (editor: TiptapEditor) => {
      const rows = clampTableDim(insertTableRows);
      const cols = clampTableDim(insertTableCols);
      setInsertTableRows(String(rows));
      setInsertTableCols(String(cols));

      const canInsert = editor
        .can()
        .chain()
        .focus()
        .insertTable({ rows, cols, withHeaderRow: true })
        .run();
      if (!canInsert) {
        setTransientStatus('Insert table unavailable');
        return;
      }

      const inserted = editor
        .chain()
        .focus()
        .insertTable({ rows, cols, withHeaderRow: true })
        .run();
      if (inserted) {
        setTransientStatus('Insert table');
        closeInsertTablePopover();
      }
    },
    [
      clampTableDim,
      closeInsertTablePopover,
      insertTableCols,
      insertTableRows,
      setTransientStatus,
    ],
  );

  const runToolbarCommand = useCallback(
    (editor: TiptapEditor, id: ToolbarCommandId) => {
      const cmd = toolbarCommandById.get(id);
      if (!cmd) return false;

      if (!hasEditorWidgetFocus) {
        setTransientStatus('Focus editor to enable toolbar');
        return false;
      }

      if (!cmd.canRun(editor)) {
        setTransientStatus(`${cmd.ariaLabel} unavailable`);
        return false;
      }

      if (id === 'insertTable') {
        openInsertTablePopover();
        return true;
      }

      const ran = cmd.run(editor);
      if (ran) setTransientStatus(cmd.ariaLabel);
      return ran;
    },
    [
      hasEditorWidgetFocus,
      openInsertTablePopover,
      setTransientStatus,
      toolbarCommandById,
    ],
  );

  useEffect(() => {
    if (!isInsertTablePopoverOpen) return;
    const timeout = setTimeout(() => {
      insertTableRowsInputRef.current?.focus();
      insertTableRowsInputRef.current?.select();
    }, 0);
    return () => clearTimeout(timeout);
  }, [isInsertTablePopoverOpen]);

  const toolbarShortcutExtension = useMemo(
    () =>
      Extension.create({
        name: 'editor-toolbar-shortcuts',
        addKeyboardShortcuts() {
          const shortcuts: Record<string, () => boolean> = {};
          for (const cmd of TOOLBAR_COMMANDS) {
            if (!cmd.shortcut) continue;
            shortcuts[cmd.shortcut] = () =>
              toolbarCommandRunnerRef.current(cmd.id);
          }
          return shortcuts;
        },
      }),
    [],
  );

  const extensions = useMemo(() => {
    return [
      toolbarShortcutExtension,
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Image.extend({
        addAttributes() {
          return {
            ...this.parent?.(),
            src: {
              default: null,
              renderHTML: (attributes) => {
                return {
                  src: ImageResolver.resolve(attributes.src, activeFile),
                };
              },
            },
          };
        },
      }),
    ];
  }, [activeFile, toolbarShortcutExtension]);

  const editor = useEditor(
    {
      extensions,
      content: '', // Initial content empty, loaded via useEffect
      editorProps: {
        attributes: {
          class: 'editor-content h-full focus:outline-none',
        },
        handleDOMEvents: createHandleDOMEvents((event) =>
          handlePaste(event, editorRef.current),
        ),
        handleKeyDown: (_view, event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === 's') {
            event.preventDefault();
            console.log('Save triggered via Cmd+S');
            // In the future, this would call a saveFile action
            return true;
          }
          return false;
        },
      },
      onUpdate: async ({ editor }: { editor: TiptapEditor }) => {
        // If we are loading content, don't update the store
        if (isLoading) return;
        if (!activeFile) return;

        const json = editor.getJSON();
        try {
          const markdown = await MarkdownService.serialize(json);
          updateFileContent(activeFile, markdown);
          setDirty(activeFile, true);
          AutosaveService.schedule(activeFile, markdown);
        } catch (error) {
          console.error('Failed to serialize editor content:', error);
        }
      },
      onBlur: () => {
        if (activeFile) {
          AutosaveService.flush(activeFile);
        }
      },
      onCreate: ({ editor }: { editor: TiptapEditor }) => {
        editorRef.current = editor;
      },
      onDestroy: () => {
        editorRef.current = null;
      },
    },
    [activeFile],
  ); // Re-create editor when activeFile changes

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

  useImperativeHandle(
    ref,
    () => ({
      insertDefaultTable: () => {
        if (!editor) return;
        editor
          .chain()
          .focus()
          .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
          .run();
      },
    }),
    [editor],
  );

  useEffect(() => {
    if (!editor || !activeFile) return;

    let isMounted = true;

    const loadContent = async () => {
      setIsLoading(true);
      try {
        const json = await MarkdownService.parse(content);
        if (isMounted) {
          editor.commands.setContent(json, { emitUpdate: false });
          // @ts-expect-error tiptap clearHistory command exists at runtime but is missing in typing.
          editor.commands.clearHistory();
        }
      } catch (error) {
        console.error('Failed to parse markdown', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadContent();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- content is intentionally excluded to avoid infinite loop (content changes → effect → editor update → onUpdate → content changes)
  }, [activeFile, editor]);
  // removed content from deps to avoid loop.
  // It only loads initial content when activeFile changes (and editor is recreated).

  if (!activeFile) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        No file open
      </div>
    );
  }

  if (!editor) {
    return null;
  }

  const isToolbarEnabled = hasEditorWidgetFocus && editor.isEditable;
  const toolbarStatus = !hasEditorWidgetFocus
    ? 'Click editor to enable'
    : statusText || 'Ready';

  return (
    <div
      className="editor-container h-full w-full flex flex-col"
      onFocusCapture={() => setHasEditorWidgetFocus(true)}
      onBlurCapture={(event) => {
        const nextFocused = event.relatedTarget as Node | null;
        if (!nextFocused || !event.currentTarget.contains(nextFocused)) {
          setHasEditorWidgetFocus(false);
        }
      }}
    >
      <div
        className="editor-toolbar"
        role="toolbar"
        aria-label="Editor toolbar"
      >
        <div className="editor-toolbar__group" aria-label="Inline">
          {TOOLBAR_COMMANDS.slice(0, 3).map((cmd) => {
            const isActive = cmd.isActive(editor);
            const isDisabled = !isToolbarEnabled || !cmd.canRun(editor);
            return (
              <button
                key={cmd.id}
                type="button"
                className={`editor-toolbar__button${isActive ? ' is-active' : ''}`}
                aria-label={cmd.ariaLabel}
                title={
                  cmd.shortcut
                    ? `${cmd.ariaLabel} (${cmd.shortcut})`
                    : cmd.ariaLabel
                }
                disabled={isDisabled}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => runToolbarCommand(editor, cmd.id)}
              >
                {cmd.label}
              </button>
            );
          })}
        </div>

        <div className="editor-toolbar__group" aria-label="Headings">
          {TOOLBAR_COMMANDS.slice(3, 6).map((cmd) => {
            const isActive = cmd.isActive(editor);
            const isDisabled = !isToolbarEnabled || !cmd.canRun(editor);
            return (
              <button
                key={cmd.id}
                type="button"
                className={`editor-toolbar__button${isActive ? ' is-active' : ''}`}
                aria-label={cmd.ariaLabel}
                title={
                  cmd.shortcut
                    ? `${cmd.ariaLabel} (${cmd.shortcut})`
                    : cmd.ariaLabel
                }
                disabled={isDisabled}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => runToolbarCommand(editor, cmd.id)}
              >
                {cmd.label}
              </button>
            );
          })}
        </div>

        <div className="editor-toolbar__group" aria-label="Blocks">
          {TOOLBAR_COMMANDS.slice(6, 10).map((cmd) => {
            const isActive = cmd.isActive(editor);
            const isDisabled = !isToolbarEnabled || !cmd.canRun(editor);
            return (
              <button
                key={cmd.id}
                type="button"
                className={`editor-toolbar__button${isActive ? ' is-active' : ''}`}
                aria-label={cmd.ariaLabel}
                title={
                  cmd.shortcut
                    ? `${cmd.ariaLabel} (${cmd.shortcut})`
                    : cmd.ariaLabel
                }
                disabled={isDisabled}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => runToolbarCommand(editor, cmd.id)}
              >
                {cmd.label}
              </button>
            );
          })}
        </div>

        <div className="editor-toolbar__group" aria-label="Insert">
          {TOOLBAR_COMMANDS.slice(10).map((cmd) => {
            const isActive = cmd.isActive(editor);
            const isDisabled = !isToolbarEnabled || !cmd.canRun(editor);
            const title = cmd.shortcut
              ? `${cmd.ariaLabel} (${cmd.shortcut})`
              : cmd.ariaLabel;

            if (cmd.id === 'insertTable') {
              return (
                <div key={cmd.id} className="relative">
                  <button
                    type="button"
                    className={`editor-toolbar__button${isActive ? ' is-active' : ''}`}
                    aria-label={cmd.ariaLabel}
                    aria-haspopup="dialog"
                    aria-expanded={isInsertTablePopoverOpen}
                    title={title}
                    disabled={isDisabled}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => runToolbarCommand(editor, cmd.id)}
                  >
                    {cmd.label}
                  </button>

                  {isInsertTablePopoverOpen ? (
                    <div
                      role="dialog"
                      aria-label="Insert table"
                      className="absolute left-0 top-full mt-2 z-20 w-56 rounded-md border border-gray-200 bg-white p-2 shadow-lg"
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          e.preventDefault();
                          closeInsertTablePopover();
                          return;
                        }
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          confirmInsertTable(editor);
                        }
                      }}
                    >
                      <div className="text-xs font-medium text-gray-700">
                        Insert table
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <label
                          htmlFor="insert-table-rows"
                          className="flex flex-col gap-1 text-xs text-gray-700"
                        >
                          Rows
                          <input
                            ref={insertTableRowsInputRef}
                            id="insert-table-rows"
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={20}
                            className="h-8 rounded border border-gray-200 px-2 text-sm"
                            value={insertTableRows}
                            onChange={(e) => setInsertTableRows(e.target.value)}
                            onBlur={() =>
                              setInsertTableRows(
                                String(clampTableDim(insertTableRows)),
                              )
                            }
                          />
                        </label>

                        <label
                          htmlFor="insert-table-cols"
                          className="flex flex-col gap-1 text-xs text-gray-700"
                        >
                          Columns
                          <input
                            id="insert-table-cols"
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={20}
                            className="h-8 rounded border border-gray-200 px-2 text-sm"
                            value={insertTableCols}
                            onChange={(e) => setInsertTableCols(e.target.value)}
                            onBlur={() =>
                              setInsertTableCols(
                                String(clampTableDim(insertTableCols)),
                              )
                            }
                          />
                        </label>
                      </div>

                      <div className="mt-2 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          className="h-8 rounded bg-gray-900 px-2 text-sm text-white"
                          aria-label="Insert table"
                          title="Insert table"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => confirmInsertTable(editor)}
                        >
                          Insert
                        </button>
                        <button
                          type="button"
                          className="h-8 rounded border border-gray-200 px-2 text-sm text-gray-800"
                          aria-label="Cancel"
                          title="Cancel"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => closeInsertTablePopover()}
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="mt-1 text-[10px] text-gray-500">
                        Enter to insert, Esc to cancel
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            }

            return (
              <button
                key={cmd.id}
                type="button"
                className={`editor-toolbar__button${isActive ? ' is-active' : ''}`}
                aria-label={cmd.ariaLabel}
                title={title}
                disabled={isDisabled}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => runToolbarCommand(editor, cmd.id)}
              >
                {cmd.label}
              </button>
            );
          })}
        </div>

        <div className="editor-toolbar__status" aria-live="polite">
          {toolbarStatus}
        </div>
      </div>
      <EditorContent editor={editor} className="flex-grow overflow-auto p-4" />
    </div>
  );
});

Editor.displayName = 'Editor';
