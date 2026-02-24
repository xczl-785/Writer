import {
  forwardRef,
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
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { useEditorStore } from '../../state/slices/editorSlice';
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

export const Editor = forwardRef<EditorHandle>((_props, ref) => {
  const { activeFile } = useWorkspaceStore();
  const { fileStates, updateFileContent, setDirty } = useEditorStore();
  const { handlePaste } = useImagePaste();

  const content = activeFile ? fileStates[activeFile]?.content || '' : '';
  const editorRef = useRef<TiptapEditor | null>(null);
  const toolbarCommandRunnerRef = useRef<(id: ToolbarCommandId) => boolean>(
    () => false,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [hasEditorWidgetFocus, setHasEditorWidgetFocus] = useState(false);
  const [editorRevision, forceRerender] = useState(0);

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
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } }),
      Table.configure({ resizable: true, allowTableNodeSelection: false }),
      TableRow,
      TableHeader,
      TableCell,
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

  return (
    <EditorShell
      editor={editor}
      isToolbarEnabled={isToolbarEnabled}
      runToolbarCommand={runToolbarCommand}
      setHasEditorWidgetFocus={setHasEditorWidgetFocus}
      toolbarStatus={toolbarStatus}
      insertTable={insertTable}
      findReplace={findReplace}
    />
  );
});

Editor.displayName = 'Editor';
