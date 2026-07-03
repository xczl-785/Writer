import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import { DOMSerializer } from '@tiptap/pm/model';
import {
  createEditorSchemaExtensions,
  createMarkdownClipboardTextParser,
  createSmartClipboardTextSerializer,
  LoadDocument,
  MarkdownService,
} from '../../core/editor';
import type { RecoveryDraftEditorState } from '../../core/session';
import { FindReplacePanel } from '../../domains/editor/ui/components/FindReplacePanel';
import { useFindReplace } from '../../domains/editor/hooks/useFindReplace';
import { applyLinkAction } from '../../domains/editor/hooks/linkActions';
import type { QuickWriteMenuCommand } from './quickWriteMenu';

const QUICK_WRITE_DEFAULT_TABLE_INSERT = {
  rows: 3,
  cols: 3,
  withHeaderRow: true,
} as const;

export interface QuickWriteRichEditorHandle {
  runCommand(command: QuickWriteMenuCommand): void;
  getMarkdownSnapshot(): Promise<string | undefined>;
  getHtmlSnapshot(): string | undefined;
  getEditorStateSnapshot(): RecoveryDraftEditorState | undefined;
  restoreEditorStateSnapshot(
    editorState: RecoveryDraftEditorState | undefined,
  ): void;
}

interface QuickWriteRichEditorProps {
  disabled?: boolean;
  value: string;
  path: string | null;
  restoreState?: RecoveryDraftEditorState;
  onMarkdownChange(value: string): void;
}

export const QuickWriteRichEditor = forwardRef<
  QuickWriteRichEditorHandle,
  QuickWriteRichEditorProps
>(function QuickWriteRichEditor(
  { disabled = false, value, path, restoreState, onMarkdownChange },
  ref,
) {
  const editorRef = useRef<Editor | null>(null);
  const applyingExternalValueRef = useRef(false);
  const activePathRef = useRef(path);
  const disabledRef = useRef(disabled);
  const lastLoadedMarkdownRef = useRef<string | null>(null);
  const loadSerialRef = useRef(0);
  const serializeSerialRef = useRef(0);
  const [isLoadingExternalValue, setIsLoadingExternalValue] = useState(false);
  const [editorRevision, setEditorRevision] = useState(0);
  const [transientStatus, setTransientStatus] = useState('');
  const pendingRestoreRef = useRef<RecoveryDraftEditorState | undefined>(
    restoreState,
  );
  const isEditorDisabled = disabled || isLoadingExternalValue;

  const extensions = useMemo(
    () => [
      LoadDocument,
      ...createEditorSchemaExtensions({ activeFile: activePathRef.current }),
    ],
    [],
  );

  const editor = useEditor(
    {
      extensions,
      content: '',
      editable: !isEditorDisabled,
      editorProps: {
        attributes: {
          'aria-label': 'QuickWrite editor',
          class: 'quick-write-editor-content',
          spellcheck: 'true',
        },
        clipboardTextParser: createMarkdownClipboardTextParser(),
        clipboardTextSerializer: createSmartClipboardTextSerializer(
          () => editorRef.current?.state ?? null,
        ),
      },
      onCreate: ({ editor }) => {
        editorRef.current = editor;
        lastLoadedMarkdownRef.current = null;
      },
      onMount: ({ editor }) => {
        installClipboardSerializer(editor);
      },
      onDestroy: () => {
        editorRef.current = null;
      },
      onUpdate: async ({ editor }) => {
        const wasDisabled = disabledRef.current;
        const wasApplyingExternalValue = applyingExternalValueRef.current;
        setEditorRevision((revision) => revision + 1);
        if (wasDisabled || wasApplyingExternalValue) {
          return;
        }
        const serializeSerial = serializeSerialRef.current + 1;
        serializeSerialRef.current = serializeSerial;
        const markdown = await MarkdownService.serialize(editor.getJSON());
        if (
          wasDisabled ||
          wasApplyingExternalValue ||
          applyingExternalValueRef.current ||
          disabledRef.current ||
          serializeSerial !== serializeSerialRef.current
        ) {
          return;
        }
        lastLoadedMarkdownRef.current = markdown;
        onMarkdownChange(markdown);
      },
    },
    [],
  );

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useEffect(() => {
    activePathRef.current = path;
  }, [path]);

  useEffect(() => {
    disabledRef.current = isEditorDisabled;
    if (!editor) return;
    editor.setEditable(!isEditorDisabled);
  }, [editor, isEditorDisabled]);

  useEffect(() => {
    pendingRestoreRef.current = restoreState;
  }, [restoreState]);

  useEffect(() => {
    if (!editor || value === lastLoadedMarkdownRef.current) {
      return;
    }

    let isMounted = true;
    const loadSerial = loadSerialRef.current + 1;
    loadSerialRef.current = loadSerial;
    serializeSerialRef.current += 1;
    setIsLoadingExternalValue(true);

    const finishLoadingExternalValue = () => {
      if (!isMounted || loadSerial !== loadSerialRef.current) {
        return;
      }
      setIsLoadingExternalValue(false);
    };

    void MarkdownService.parse(value)
      .then((json) => {
        if (!isMounted || loadSerial !== loadSerialRef.current) {
          return;
        }
        applyingExternalValueRef.current = true;
        try {
          editor.commands.loadDocument(json);
          lastLoadedMarkdownRef.current = value;
          restoreEditorState(editor, pendingRestoreRef.current);
          pendingRestoreRef.current = undefined;
          setEditorRevision((revision) => revision + 1);
        } finally {
          applyingExternalValueRef.current = false;
          finishLoadingExternalValue();
        }
      })
      .catch(() => {
        if (!isMounted || loadSerial !== loadSerialRef.current) {
          return;
        }
        applyingExternalValueRef.current = true;
        try {
          editor.commands.loadDocument({
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: value ? [{ type: 'text', text: value }] : undefined,
              },
            ],
          });
          lastLoadedMarkdownRef.current = value;
          restoreEditorState(editor, pendingRestoreRef.current);
          pendingRestoreRef.current = undefined;
          setEditorRevision((revision) => revision + 1);
        } finally {
          applyingExternalValueRef.current = false;
          finishLoadingExternalValue();
        }
      });

    return () => {
      isMounted = false;
      if (loadSerial === loadSerialRef.current) {
        setIsLoadingExternalValue(false);
      }
    };
  }, [editor, value]);

  const findReplace = useFindReplace({
    editor,
    editorRevision,
    setTransientStatus,
  });

  useImperativeHandle(
    ref,
    () => ({
      runCommand(command) {
        const targetEditor = editorRef.current;
        if (!targetEditor || isEditorDisabled) {
          return;
        }
        runQuickWriteEditorCommand(targetEditor, command, {
          openFindPanel: findReplace.openFindPanel,
        });
      },
      async getMarkdownSnapshot() {
        const targetEditor = editorRef.current;
        if (!targetEditor) {
          return undefined;
        }
        return MarkdownService.serialize(targetEditor.getJSON());
      },
      getHtmlSnapshot() {
        const targetEditor = editorRef.current;
        if (!targetEditor) {
          return undefined;
        }
        return targetEditor.getHTML();
      },
      getEditorStateSnapshot() {
        const targetEditor = editorRef.current;
        if (!targetEditor) {
          return undefined;
        }
        const { anchor, head } = targetEditor.state.selection;
        return {
          selection: { anchor, head, updatedAt: Date.now() },
          scrollTop: getEditorScrollTop(targetEditor),
        };
      },
      restoreEditorStateSnapshot(editorState) {
        const targetEditor = editorRef.current;
        if (!targetEditor) {
          pendingRestoreRef.current = editorState;
          return;
        }
        restoreEditorState(targetEditor, editorState);
      },
    }),
    [findReplace.openFindPanel, isEditorDisabled],
  );

  return (
    <div
      className="quick-write-editor"
      data-markdown={value}
      data-disabled={isEditorDisabled ? 'true' : 'false'}
      data-restored-scroll-top={undefined}
      data-restored-selection={undefined}
    >
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
      <span className="quick-write-editor-status" aria-live="polite">
        {transientStatus}
      </span>
      <EditorContent editor={editor} />
    </div>
  );
});

export const installClipboardSerializer = (editor: Editor): void => {
  const clipboardSerializer = DOMSerializer.fromSchema(editor.schema);
  editor.setOptions({
    editorProps: {
      ...editor.options.editorProps,
      clipboardSerializer,
    },
  });
};

const runQuickWriteEditorCommand = (
  editor: Editor,
  command: QuickWriteMenuCommand,
  findReplace: { openFindPanel(mode: 'find' | 'replace'): void },
) => {
  switch (command) {
    case 'edit.undo':
      editor.chain().focus().undo().run();
      return;
    case 'edit.cut':
    case 'edit.copy':
    case 'edit.paste':
      editor.commands.focus();
      document.execCommand?.(command.slice('edit.'.length));
      return;
    case 'edit.selectAll':
      editor.chain().focus().selectAll().run();
      return;
    case 'edit.find':
      findReplace.openFindPanel('find');
      return;
    case 'edit.replace':
      findReplace.openFindPanel('replace');
      return;
    case 'format.bold':
      editor.chain().focus().toggleBold().run();
      return;
    case 'format.italic':
      editor.chain().focus().toggleItalic().run();
      return;
    case 'format.link':
      applyLinkAction(editor);
      return;
    case 'paragraph.body':
      editor.chain().focus().setParagraph().run();
      return;
    case 'paragraph.heading':
      editor.chain().focus().toggleHeading({ level: 1 }).run();
      return;
    case 'paragraph.bulletedList':
      editor.chain().focus().toggleBulletList().run();
      return;
    case 'paragraph.numberedList':
      editor.chain().focus().toggleOrderedList().run();
      return;
    case 'paragraph.table':
      editor.chain().focus().insertTable(QUICK_WRITE_DEFAULT_TABLE_INSERT).run();
      return;
    case 'file.open':
    case 'file.saveTo':
    case 'file.exportHtml':
    case 'file.newWindow':
    case 'file.close':
    case 'file.exit':
      return;
  }
};

const restoreEditorState = (
  editor: Editor,
  editorState: RecoveryDraftEditorState | undefined,
) => {
  if (!editorState) {
    return;
  }

  if (editorState.selection) {
    const maxPosition = editor.state.doc.content.size;
    const anchor = clampPosition(editorState.selection.anchor, maxPosition);
    const head = clampPosition(editorState.selection.head, maxPosition);
    editor.commands.setTextSelection({ from: anchor, to: head });
    editor.view.dom
      .closest('.quick-write-editor')
      ?.setAttribute('data-restored-selection', `${anchor}:${head}`);
  }

  const scrollTop = editorState.scrollTop;
  if (scrollTop !== undefined) {
    const scrollContainer = getEditorScrollContainer(editor);
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollTop;
      scrollContainer.setAttribute(
        'data-restored-scroll-top',
        String(scrollTop),
      );
    }
  }
};

const getEditorScrollTop = (editor: Editor): number => {
  const scrollContainer = getEditorScrollContainer(editor);
  return Math.max(0, Math.round(scrollContainer?.scrollTop ?? 0));
};

const getEditorScrollContainer = (editor: Editor): HTMLElement | null =>
  editor.view.dom.closest('.quick-write-editor');

const clampPosition = (position: number, maxPosition: number): number =>
  Math.max(0, Math.min(position, maxPosition));
