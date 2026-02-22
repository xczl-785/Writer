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
import { NodeSelection, TextSelection } from '@tiptap/pm/state';
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

type FindTextMatch = {
  from: number;
  to: number;
};

const FIND_MATCH_LIMIT = 1000;

function collectFindTextMatches(
  editor: TiptapEditor,
  query: string,
): FindTextMatch[] {
  if (!query) return [];

  const matches: FindTextMatch[] = [];
  const term = query;

  editor.state.doc.descendants((node, pos) => {
    if (matches.length >= FIND_MATCH_LIMIT) return false;
    if (!node.isText || !node.text) return true;

    const text = node.text;
    let searchFrom = 0;
    while (matches.length < FIND_MATCH_LIMIT) {
      const index = text.indexOf(term, searchFrom);
      if (index === -1) break;
      const from = pos + index;
      matches.push({ from, to: from + term.length });
      searchFrom = index + Math.max(1, term.length);
    }

    return true;
  });

  return matches;
}

function getActiveFindMatchIndex(
  matches: readonly FindTextMatch[],
  selectionFrom: number,
  selectionTo: number,
): number {
  if (matches.length === 0) return -1;
  const exact = matches.findIndex(
    (m) => m.from === selectionFrom && m.to === selectionTo,
  );
  if (exact !== -1) return exact;

  const anchor = selectionFrom;
  const containing = matches.findIndex(
    (m) => anchor >= m.from && anchor <= m.to,
  );
  return containing;
}

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
  | 'deleteTableColumn'
  | 'deleteTable';

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
  {
    id: 'deleteTable',
    label: 'Del Tbl',
    ariaLabel: 'Delete table',
    shortcut: '',
    isActive: () => false,
    canRun: (editor) => editor.can().chain().focus().deleteTable().run(),
    run: (editor) => editor.chain().focus().deleteTable().run(),
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
  const [editorRevision, forceRerender] = useState(0);

  const [isFindPanelOpen, setIsFindPanelOpen] = useState(false);
  const [isReplaceMode, setIsReplaceMode] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [findMatches, setFindMatches] = useState<FindTextMatch[]>([]);
  const [activeFindMatchIndex, setActiveFindMatchIndex] = useState(-1);
  const findInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);

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

  const setDestructiveStatus = useCallback(
    (action: string) => {
      setTransientStatus(`${action} deleted`);
    },
    [setTransientStatus],
  );

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
      if (ran) {
        if (id.startsWith('delete')) {
          setDestructiveStatus(cmd.ariaLabel.replace(/^Delete\s+/i, ''));
        } else {
          setTransientStatus(cmd.ariaLabel);
        }
      }
      return ran;
    },
    [
      hasEditorWidgetFocus,
      openInsertTablePopover,
      setDestructiveStatus,
      setTransientStatus,
      toolbarCommandById,
    ],
  );

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

  const openFindPanel = useCallback((mode: 'find' | 'replace') => {
    setIsFindPanelOpen(true);
    setIsReplaceMode(mode === 'replace');
  }, []);

  const closeFindPanel = useCallback(() => {
    setIsFindPanelOpen(false);
    setIsReplaceMode(false);
    editorRef.current?.commands.focus();
  }, []);

  const findReplaceShortcutExtension = useMemo(
    () =>
      Extension.create({
        name: 'editor-find-replace-shortcuts',
        addKeyboardShortcuts() {
          return {
            'Mod-f': () => {
              openFindPanel('find');
              return true;
            },
            'Mod-h': () => {
              openFindPanel('replace');
              return true;
            },
            'Mod-z': () => {
              if (editorRef.current) return undo(editorRef.current);
              return false;
            },
            'Mod-y': () => {
              if (editorRef.current) return redo(editorRef.current);
              return false;
            },
            'Mod-Shift-z': () => {
              if (editorRef.current) return redo(editorRef.current);
              return false;
            },
          };
        },
      }),
    [openFindPanel, undo, redo],
  );

  const extensions = useMemo(() => {
    return [
      toolbarShortcutExtension,
      findReplaceShortcutExtension,
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
  }, [activeFile, findReplaceShortcutExtension, toolbarShortcutExtension]);

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

          if (
            event.key === 'Backspace' &&
            !event.metaKey &&
            !event.ctrlKey &&
            !event.altKey &&
            !event.shiftKey
          ) {
            const { state, dispatch } = _view;
            const { selection, doc } = state;

            // Case 1: Table is already node-selected → delete it.
            if (
              selection instanceof NodeSelection &&
              selection.node.type.name === 'table'
            ) {
              event.preventDefault();
              if (editorRef.current) {
                editorRef.current.commands.deleteTable();
                setDestructiveStatus('Table');
              }
              return true;
            }

            // Case 2: Cursor is at the very start of a block right after a table.
            // Use $pos.nodeBefore to correctly resolve the preceding block-level
            // sibling. The old approach `doc.nodeAt(pos - 1)` pointed to the
            // paragraph's own open-tag position, not the table before it.
            if (
              selection instanceof TextSelection &&
              selection.empty &&
              selection.$anchor.parentOffset === 0
            ) {
              // Resolve to the position just before the current block to find
              // the previous sibling via nodeBefore.
              const $anchor = selection.$anchor;
              const depth = $anchor.depth;
              const parentStartPos = $anchor.start(depth);
              // The position *before* the current block's open tag is one
              // position before its start, at the grandparent level.
              const beforeBlockPos = parentStartPos - 1;

              if (beforeBlockPos >= 0) {
                const $beforeBlock = doc.resolve(beforeBlockPos);
                const nodeBefore = $beforeBlock.nodeBefore;

                if (nodeBefore && nodeBefore.type.name === 'table') {
                  const parent = $anchor.parent;
                  const isParentEmpty = parent.textContent.trim().length === 0;

                  // Calculate the absolute start position of the table node so
                  // we can create a proper NodeSelection for it.
                  const tableStartPos = beforeBlockPos - nodeBefore.nodeSize;

                  if (isParentEmpty) {
                    // Empty paragraph after table: select the table and delete
                    // the now-redundant empty paragraph in one transaction.
                    event.preventDefault();
                    const tr = state.tr;
                    // Delete the empty paragraph first (its range is
                    // [parentStartPos - 1, parentStartPos + parent.nodeSize - 1]).
                    const paragraphFrom = parentStartPos - 1;
                    const paragraphTo = paragraphFrom + parent.nodeSize + 2;
                    // Safety: only delete if range is valid.
                    if (paragraphTo <= doc.content.size && paragraphFrom >= 0) {
                      tr.delete(paragraphFrom, paragraphTo);
                    }
                    // After deletion the table position shifts; recalculate.
                    const mappedTablePos = tr.mapping.map(tableStartPos);
                    const nodeSelection = NodeSelection.create(
                      tr.doc,
                      mappedTablePos,
                    );
                    tr.setSelection(nodeSelection);
                    dispatch(tr);
                    setTransientStatus(
                      'Table selected. Press Backspace again to delete.',
                    );
                    return true;
                  } else {
                    // Non-empty paragraph after table: select the table without
                    // deleting, user can press Backspace again to confirm.
                    event.preventDefault();
                    const nodeSelection = NodeSelection.create(
                      doc,
                      tableStartPos,
                    );
                    dispatch(state.tr.setSelection(nodeSelection));
                    setTransientStatus(
                      'Table selected. Press Backspace again to delete.',
                    );
                    return true;
                  }
                }
              }
            }
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
          let markdown = await MarkdownService.serialize(json);
          // Sanitize non-breaking spaces (\xA0 / &nbsp;) that browsers inject
          // during copy-paste operations, especially inside table cells.
          // Without this, &nbsp; leaks into persisted Markdown and becomes
          // visible as literal "&nbsp;" text on subsequent loads.

          markdown = markdown.replace(/\xA0/g, ' ');
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

  useEffect(() => {
    if (!isFindPanelOpen) return;
    const timeout = setTimeout(() => {
      const target = isReplaceMode
        ? replaceInputRef.current
        : findInputRef.current;
      target?.focus();
      target?.select();
    }, 0);
    return () => clearTimeout(timeout);
  }, [isFindPanelOpen, isReplaceMode]);

  useEffect(() => {
    if (!editor) return;
    if (!isFindPanelOpen) return;

    if (!findQuery) {
      setFindMatches([]);
      setActiveFindMatchIndex(-1);
      return;
    }

    const nextMatches = collectFindTextMatches(editor, findQuery);
    setFindMatches(nextMatches);
    setActiveFindMatchIndex(
      getActiveFindMatchIndex(
        nextMatches,
        editor.state.selection.from,
        editor.state.selection.to,
      ),
    );
  }, [editor, editorRevision, findQuery, isFindPanelOpen]);

  const goToFindMatchIndex = useCallback(
    (index: number) => {
      if (!editor) return;
      const match = findMatches[index];
      if (!match) return;
      editor
        .chain()
        .focus()
        .setTextSelection({ from: match.from, to: match.to })
        .run();
      setActiveFindMatchIndex(index);
    },
    [editor, findMatches],
  );

  const goToNextFindMatch = useCallback(() => {
    if (!findQuery) {
      setTransientStatus('Enter text to find');
      findInputRef.current?.focus();
      findInputRef.current?.select();
      return;
    }
    if (!findMatches.length) {
      setTransientStatus('No matches');
      return;
    }
    const nextIndex =
      activeFindMatchIndex < 0
        ? 0
        : (activeFindMatchIndex + 1) % findMatches.length;
    goToFindMatchIndex(nextIndex);
  }, [
    activeFindMatchIndex,
    findMatches.length,
    findQuery,
    goToFindMatchIndex,
    setTransientStatus,
  ]);

  const goToPrevFindMatch = useCallback(() => {
    if (!findQuery) {
      setTransientStatus('Enter text to find');
      findInputRef.current?.focus();
      findInputRef.current?.select();
      return;
    }
    if (!findMatches.length) {
      setTransientStatus('No matches');
      return;
    }
    const nextIndex =
      activeFindMatchIndex < 0
        ? findMatches.length - 1
        : (activeFindMatchIndex - 1 + findMatches.length) % findMatches.length;
    goToFindMatchIndex(nextIndex);
  }, [
    activeFindMatchIndex,
    findMatches.length,
    findQuery,
    goToFindMatchIndex,
    setTransientStatus,
  ]);

  const replaceOneActiveMatch = useCallback(() => {
    if (!editor) return;
    if (!findQuery) {
      setTransientStatus('Enter text to find');
      findInputRef.current?.focus();
      findInputRef.current?.select();
      return;
    }
    if (!findMatches.length) {
      setTransientStatus('No matches');
      return;
    }

    const index = activeFindMatchIndex < 0 ? 0 : activeFindMatchIndex;
    const match = findMatches[index];
    if (!match) return;

    editor
      .chain()
      .focus()
      .insertContentAt({ from: match.from, to: match.to }, replaceQuery)
      .run();

    const nextMatches = collectFindTextMatches(editor, findQuery);
    setFindMatches(nextMatches);
    if (nextMatches.length === 0) {
      setActiveFindMatchIndex(-1);
      return;
    }

    const nextIndex = Math.min(index, nextMatches.length - 1);
    const nextMatch = nextMatches[nextIndex];
    editor
      .chain()
      .focus()
      .setTextSelection({ from: nextMatch.from, to: nextMatch.to })
      .run();
    setActiveFindMatchIndex(nextIndex);
  }, [
    activeFindMatchIndex,
    editor,
    findMatches,
    findQuery,
    replaceQuery,
    setTransientStatus,
  ]);

  const replaceAllActiveMatches = useCallback(() => {
    if (!editor) return;
    if (!findQuery) {
      setTransientStatus('Enter text to find');
      findInputRef.current?.focus();
      findInputRef.current?.select();
      return;
    }

    const matchesToReplace = collectFindTextMatches(editor, findQuery);
    if (matchesToReplace.length === 0) {
      setTransientStatus('No matches');
      return;
    }

    editor
      .chain()
      .focus()
      .command(({ tr, dispatch }) => {
        for (let i = matchesToReplace.length - 1; i >= 0; i--) {
          const match = matchesToReplace[i];
          tr.insertText(replaceQuery, match.from, match.to);
        }
        if (dispatch) dispatch(tr);
        return true;
      })
      .run();

    const nextMatches = collectFindTextMatches(editor, findQuery);
    setFindMatches(nextMatches);
    setActiveFindMatchIndex(
      getActiveFindMatchIndex(
        nextMatches,
        editor.state.selection.from,
        editor.state.selection.to,
      ),
    );

    const replacedCount = matchesToReplace.length;
    setTransientStatus(
      replacedCount === 1
        ? 'Replaced 1 match'
        : `Replaced ${replacedCount} matches`,
    );
  }, [editor, findQuery, replaceQuery, setTransientStatus]);

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

  const findCountText = !findQuery
    ? 'Enter find query'
    : findMatches.length >= FIND_MATCH_LIMIT
      ? `> ${FIND_MATCH_LIMIT - 1} matches`
      : findMatches.length === 1
        ? '1 match'
        : `${findMatches.length} matches`;

  const findProgressText = findMatches.length
    ? `${Math.max(0, activeFindMatchIndex + 1)}/${findMatches.length}`
    : '';

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

        <div className="editor-toolbar__group" aria-label="Find and replace">
          {isFindPanelOpen ? (
            <div
              className="flex flex-wrap items-center gap-2"
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  e.preventDefault();
                  closeFindPanel();
                  return;
                }
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (e.shiftKey) {
                    goToPrevFindMatch();
                  } else {
                    goToNextFindMatch();
                  }
                }
              }}
            >
              <input
                ref={findInputRef}
                type="text"
                inputMode="search"
                placeholder="Find"
                aria-label="Find"
                className="h-8 w-40 rounded border border-gray-200 px-2 text-sm"
                value={findQuery}
                onChange={(e) => setFindQuery(e.target.value)}
              />

              {isReplaceMode ? (
                <input
                  ref={replaceInputRef}
                  type="text"
                  placeholder="Replace"
                  aria-label="Replace"
                  className="h-8 w-40 rounded border border-gray-200 px-2 text-sm"
                  value={replaceQuery}
                  onChange={(e) => setReplaceQuery(e.target.value)}
                />
              ) : null}

              <button
                type="button"
                className="editor-toolbar__button"
                aria-label="Previous match"
                title="Previous match (Shift+Enter)"
                disabled={!findMatches.length}
                onMouseDown={(e) => e.preventDefault()}
                onClick={goToPrevFindMatch}
              >
                Prev
              </button>
              <button
                type="button"
                className="editor-toolbar__button"
                aria-label="Next match"
                title="Next match (Enter)"
                disabled={!findMatches.length}
                onMouseDown={(e) => e.preventDefault()}
                onClick={goToNextFindMatch}
              >
                Next
              </button>

              {isReplaceMode ? (
                <button
                  type="button"
                  className="editor-toolbar__button"
                  aria-label="Replace match"
                  title="Replace current match"
                  disabled={!findMatches.length}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={replaceOneActiveMatch}
                >
                  Replace
                </button>
              ) : null}

              {isReplaceMode ? (
                <button
                  type="button"
                  className="editor-toolbar__button"
                  aria-label="Replace all matches"
                  title="Replace all matches"
                  disabled={!findMatches.length}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={replaceAllActiveMatches}
                >
                  Replace all
                </button>
              ) : null}

              <span className="text-xs text-gray-600" aria-label="Match count">
                {findCountText}
              </span>

              {findProgressText ? (
                <span
                  className="min-w-10 text-xs tabular-nums text-gray-500"
                  aria-label="Match progress"
                >
                  {findProgressText}
                </span>
              ) : null}

              <button
                type="button"
                className="editor-toolbar__button"
                aria-label="Close find"
                title="Close (Esc)"
                onMouseDown={(e) => e.preventDefault()}
                onClick={closeFindPanel}
              >
                X
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="editor-toolbar__button"
                aria-label="Find"
                title="Find (Mod-f)"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => openFindPanel('find')}
              >
                Find
              </button>
              <button
                type="button"
                className="editor-toolbar__button"
                aria-label="Replace"
                title="Replace (Mod-h)"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => openFindPanel('replace')}
              >
                Replace
              </button>
            </>
          )}
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
