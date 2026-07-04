import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import {
  SingleDocumentEditor,
  type SingleDocumentEditorCommand,
  type SingleDocumentEditorHandle,
} from '../../domains/editor/core/SingleDocumentEditor';
import type { RecoveryDraftEditorState } from '../../core/session';
import type { QuickWriteCommand } from './quickWriteCommands';

export interface QuickWriteEditorHandle {
  runCommand(command: QuickWriteCommand): void;
  getMarkdownSnapshot(): Promise<string | undefined>;
  getHtmlSnapshot(): string | undefined;
  getEditorStateSnapshot(): RecoveryDraftEditorState | undefined;
  restoreEditorStateSnapshot(
    editorState: RecoveryDraftEditorState | undefined,
  ): void;
}

interface QuickWriteEditorProps {
  disabled?: boolean;
  draftLabel: string;
  documentId: string | null;
  value: string;
  path: string | null;
  restoreState?: RecoveryDraftEditorState;
  onMarkdownChange(value: string): void;
  onSaveShortcut?: () => void;
  onLoadStateChange?: (isLoading: boolean) => void;
}

export const QuickWriteEditor = forwardRef<
  QuickWriteEditorHandle,
  QuickWriteEditorProps
>(function QuickWriteEditor(
  {
    disabled = false,
    draftLabel,
    documentId,
    value,
    path,
    restoreState,
    onMarkdownChange,
    onSaveShortcut,
    onLoadStateChange,
  },
  ref,
) {
  const editorRef = useRef<SingleDocumentEditorHandle | null>(null);
  const resolvedDocumentId = documentId ?? `quickwrite://draft/${draftLabel}`;
  const loadKey = resolvedDocumentId;

  useEffect(() => {
    if (!restoreState) return;
    editorRef.current?.restoreEditorStateSnapshot(restoreState);
  }, [loadKey, restoreState]);

  useImperativeHandle(
    ref,
    () => ({
      runCommand(command) {
        const editorCommand = toSingleDocumentEditorCommand(command);
        if (editorCommand) {
          editorRef.current?.runCommand(editorCommand);
        }
      },
      getMarkdownSnapshot() {
        return (
          editorRef.current?.getMarkdownSnapshot() ?? Promise.resolve(undefined)
        );
      },
      getHtmlSnapshot() {
        return editorRef.current?.getHtmlSnapshot();
      },
      getEditorStateSnapshot() {
        return editorRef.current?.getEditorStateSnapshot();
      },
      restoreEditorStateSnapshot(editorState) {
        editorRef.current?.restoreEditorStateSnapshot(editorState);
      },
    }),
    [],
  );

  return (
    <SingleDocumentEditor
      ref={editorRef}
      className="quick-write-editor"
      content={value}
      disabled={disabled}
      documentId={resolvedDocumentId}
      loadKey={loadKey}
      readOnly={disabled}
      breadcrumb={<span>{path ?? draftLabel}</span>}
      onMarkdownChange={onMarkdownChange}
      onSaveShortcut={onSaveShortcut}
      onLoadStateChange={onLoadStateChange}
    />
  );
});

function toSingleDocumentEditorCommand(
  command: QuickWriteCommand,
): SingleDocumentEditorCommand | null {
  switch (command) {
    case 'edit.undo':
    case 'edit.redo':
    case 'edit.cut':
    case 'edit.copy':
    case 'edit.paste':
    case 'edit.selectAll':
    case 'edit.find':
    case 'edit.replace':
    case 'format.bold':
    case 'format.italic':
    case 'format.link':
      return command.replace('selectAll', 'select_all') as
        | 'edit.select_all'
        | SingleDocumentEditorCommand;
    case 'paragraph.body':
      return 'paragraph.body';
    case 'paragraph.heading':
      return 'paragraph.heading_1';
    case 'paragraph.bulletedList':
      return 'paragraph.unordered_list';
    case 'paragraph.numberedList':
      return 'paragraph.ordered_list';
    case 'paragraph.table':
      return 'paragraph.table';
    default:
      return null;
  }
}
