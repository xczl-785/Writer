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
import { createEditorPasteDOMEvents } from '../integration/pasteBridge';
import { createMarkdownClipboardTextParser } from '../integration/markdownClipboard';
import { createSmartClipboardTextSerializer } from '../integration/smartClipboardSerializer';
import { handleEditorLinkClick } from '../handlers/linkClickHandler';
import { createEditorSchemaExtensions } from './editorExtensions';

type EditorAwarePasteHandler = (
  event: ClipboardEvent,
  targetEditor: TiptapEditor | null,
) => boolean | Promise<boolean>;

export type SingleDocumentEditorStatus = 'idle' | 'error';

export type SingleDocumentEditorContract = {
  documentId: string | null;
  loadKey: string | null;
  content: string;
  disabled?: boolean;
  readOnly?: boolean;
  editorRef: RefObject<TiptapEditor | null>;
  extensions: AnyExtension[];
  handlePaste?: EditorAwarePasteHandler;
  onMarkdownChange: (content: string) => void | Promise<void>;
  onBlur?: () => void;
  onSaveShortcut?: () => void;
  onLoadStateChange?: (isLoading: boolean) => void;
  onStatus?: (status: SingleDocumentEditorStatus, message: string) => void;
  onError?: (error: unknown, context: string) => void;
  onEditorRevisionChange: () => void;
};

const withSourceMarkers = <T>(_markers: readonly string[], value: T): T =>
  value;

const defaultPasteHandler: EditorAwarePasteHandler = () => false;

function sanitizeSerializedMarkdown(markdown: string): string {
  return markdown
    .replace(/\xA0/g, ' ')
    .replace(/\|\s*&nbsp;\s*(?=\|)/g, '|   ');
}

function createPlainTextDocument(content: string) {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: content ? [{ type: 'text', text: content }] : undefined,
      },
    ],
  };
}

export function useSingleDocumentEditorController({
  documentId,
  loadKey,
  content,
  disabled = false,
  readOnly = false,
  editorRef,
  extensions,
  handlePaste = defaultPasteHandler,
  onMarkdownChange,
  onBlur,
  onSaveShortcut,
  onLoadStateChange,
  onStatus,
  onError,
  onEditorRevisionChange,
}: SingleDocumentEditorContract) {
  const [isLoading, setIsLoading] = useState(false);

  const instanceExtensions = useMemo(
    () => [
      ...extensions,
      CodeBlockSelectAll,
      BlockBoundaryExtension.configure({ showCodeBlock: false }),
      LoadDocument,
      ...createEditorSchemaExtensions({ activeFile: documentId }),
    ],
    [documentId, extensions],
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
      editable: !disabled && !readOnly,
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
          createEditorKeyDownHandler({ editorRef, onSaveShortcut }),
        ),
      },
      onUpdate: async ({ editor }: { editor: TiptapEditor }) => {
        if (isLoading || !documentId || disabled || readOnly) return;

        try {
          const markdown = sanitizeSerializedMarkdown(
            await MarkdownService.serialize(editor.getJSON()),
          );
          await onMarkdownChange(markdown);
        } catch (error) {
          onError?.(error, 'Failed to serialize editor content');
          if (!onError) {
            ErrorService.handle(error, 'Failed to serialize editor content');
          }
          onStatus?.('error', 'Failed to update editor content');
        }
      },
      onBlur: () => {
        onBlur?.();
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
    [loadKey],
  );

  useEffect(() => {
    editor?.setEditable(!disabled && !readOnly);
  }, [disabled, editor, readOnly]);

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
    if (!editor || !loadKey) return;
    let isMounted = true;
    const loadContent = async () => {
      setIsLoading(true);
      onLoadStateChange?.(true);
      try {
        const json = await MarkdownService.parse(content);
        if (!isMounted) return;
        try {
          editor.commands.loadDocument(json);
        } catch (schemaError) {
          onError?.(
            schemaError,
            'Editor schema mismatch while loading file content',
          );
          if (!onError) {
            ErrorService.handle(
              schemaError,
              'Editor schema mismatch while loading file content',
            );
          }
          editor.commands.loadDocument(createPlainTextDocument(content));
        }
      } catch (parseError) {
        onError?.(parseError, 'Failed to parse markdown content');
        if (!onError) {
          ErrorService.handle(parseError, 'Failed to parse markdown content');
        }
        if (isMounted) {
          editor.commands.loadDocument(createPlainTextDocument(content));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          onLoadStateChange?.(false);
        }
      }
    };
    loadContent();
    return () => {
      isMounted = false;
      onLoadStateChange?.(false);
    };
    // Content comes from the loaded document snapshot and must not retrigger
    // loads while the user is editing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, loadKey, onLoadStateChange]);

  return {
    editor,
    isLoading,
    serializeMarkdown: async () => {
      if (!editor) return undefined;
      return sanitizeSerializedMarkdown(
        await MarkdownService.serialize(editor.getJSON()),
      );
    },
  };
}
