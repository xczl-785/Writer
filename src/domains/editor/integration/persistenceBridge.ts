import type { Editor as TiptapEditor } from '@tiptap/react';
import { AutosaveService } from '../../file/services/AutosaveService';
import { ErrorService } from '../../../services/error/ErrorService';
import { MarkdownService } from '../../../services/markdown/MarkdownService';

type PersistEditorUpdateArgs = {
  editor: TiptapEditor;
  activeFile: string | null;
  isLoading: boolean;
  updateFileContent: (path: string, content: string) => void;
  setDirty: (path: string, isDirty: boolean) => void;
};

export async function persistEditorUpdate({
  editor,
  activeFile,
  isLoading,
  updateFileContent,
  setDirty,
}: PersistEditorUpdateArgs): Promise<void> {
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
}

export function flushEditorOnBlur(activeFile: string | null): void {
  if (activeFile) {
    void AutosaveService.flush(activeFile);
  }
}
