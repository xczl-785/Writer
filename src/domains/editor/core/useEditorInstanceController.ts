import type { AnyExtension } from '@tiptap/core';
import type { Editor as TiptapEditor } from '@tiptap/react';
import type { RefObject } from 'react';
import { AutosaveService } from '../../file/services/AutosaveService';
import { flushEditorOnBlur } from '../integration';
import { useSingleDocumentEditorController } from './useSingleDocumentEditorController';

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
  return useSingleDocumentEditorController({
    documentId: activeFile,
    loadKey: activeFile,
    content,
    editorRef,
    extensions,
    handlePaste,
    onMarkdownChange: (markdown) => {
      if (!activeFile) return;
      updateFileContent(activeFile, markdown);
      setDirty(activeFile, true);
      AutosaveService.schedule(activeFile, markdown);
    },
    onBlur: () => flushEditorOnBlur(activeFile),
    onEditorRevisionChange,
  });
}
