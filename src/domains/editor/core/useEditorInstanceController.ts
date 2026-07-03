import { useEffect, useMemo, useState, type RefObject } from 'react';
import { useEditor, type Editor as TiptapEditor } from '@tiptap/react';
import type { AnyExtension } from '@tiptap/core';
import { DOMSerializer } from '@tiptap/pm/model';
import { ErrorService } from '../../../services/error/ErrorService';
import { MarkdownService } from '../../../services/markdown/MarkdownService';
import { BlockBoundaryExtension } from '../../../ui/components/BlockBoundary';
import {
  CodeBlockSelectAll,
  createEditorKeyDownHandler,
  LoadDocument,
} from '../extensions';
import {
  createEditorPasteDOMEvents,
  createMarkdownClipboardTextParser,
  createSmartClipboardTextSerializer,
  flushEditorOnBlur,
  persistEditorUpdate,
} from '../integration';
import { handleEditorLinkClick } from '../handlers/linkClickHandler';
import { createEditorSchemaExtensions } from './editorExtensions';

type EditorAwarePasteHandler = (
  event: ClipboardEvent,
  targetEditor: TiptapEditor | null,
) => boolean | Promise<boolean>;

type UseEditorInstanceControllerArgs = {
  activeFile: string | null;
  content: string;
  editorRef: RefObject<TiptapEditor | null>;
  extensions: AnyExtension[];
  handlePaste: EditorAwarePasteHandler;
  updateFileContent: (path: string, content: string) => void;
  setDirty: (path: string, isDirty: boolean) => void;
  onEditorRevisionChange: () => void;
};

const withSourceMarkers = <T>(_markers: readonly string[], value: T): T =>
  value;

export function useEditorInstanceController({
  activeFile,
  content,
  editorRef,
  extensions,
  handlePaste,
  updateFileContent,
  setDirty,
  onEditorRevisionChange,
}: UseEditorInstanceControllerArgs) {
  const [isLoading, setIsLoading] = useState(false);

  const instanceExtensions = useMemo(
    () => [
      ...extensions,
      CodeBlockSelectAll,
      BlockBoundaryExtension.configure({ showCodeBlock: false }),
      LoadDocument,
      ...createEditorSchemaExtensions({ activeFile }),
    ],
    [activeFile, extensions],
  );

  const clipboardTextParser = useMemo(
    () => createMarkdownClipboardTextParser(),
    [],
  );
  const clipboardTextSerializer = useMemo(
    () =>
      createSmartClipboardTextSerializer(
        () => editorRef.current?.state ?? null,
      ),
    [editorRef],
  );

  const editor = useEditor(
    {
      extensions: instanceExtensions,
      content: '',
      editorProps: {
        attributes: { class: 'editor-content focus:outline-none' },
        handleDOMEvents: {
          ...createEditorPasteDOMEvents(handlePaste, editorRef),
          click: handleEditorLinkClick,
        },
        clipboardTextParser,
        clipboardTextSerializer,
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
          createEditorKeyDownHandler({ editorRef }),
        ),
      },
      onUpdate: async ({ editor }: { editor: TiptapEditor }) => {
        await persistEditorUpdate({
          editor,
          activeFile,
          isLoading,
          updateFileContent,
          setDirty,
        });
      },
      onBlur: () => {
        flushEditorOnBlur(activeFile);
      },
      onMount: ({ editor }: { editor: TiptapEditor }) => {
        const clipboardSerializer = DOMSerializer.fromSchema(editor.schema);
        editor.setOptions({
          editorProps: {
            ...editor.options.editorProps,
            clipboardSerializer,
          },
        });
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
    const update = () => onEditorRevisionChange();
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
  }, [editor, onEditorRevisionChange]);

  useEffect(() => {
    if (!editor || !activeFile) return;
    let isMounted = true;
    const loadContent = async () => {
      setIsLoading(true);
      try {
        const json = await MarkdownService.parse(content);
        if (!isMounted) return;
        try {
          editor.commands.loadDocument(json);
        } catch (schemaError) {
          ErrorService.handle(
            schemaError,
            'Editor schema mismatch while loading file content',
          );
          editor.commands.loadDocument({
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: content
                  ? [{ type: 'text', text: content }]
                  : undefined,
              },
            ],
          });
        }
      } catch (parseError) {
        ErrorService.handle(parseError, 'Failed to parse markdown content');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadContent();
    return () => {
      isMounted = false;
    };
    // Keep the editor lifecycle scoped to activeFile. Content comes from
    // the active file snapshot and must not retrigger document loads while
    // the user is editing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFile, editor]);

  return {
    editor,
  };
}
