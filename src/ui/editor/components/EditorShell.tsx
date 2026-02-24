import { EditorContent, type Editor as TiptapEditor } from '@tiptap/react';
import type { RefObject } from 'react';
import type { ToolbarCommandId } from '../constants';
import { Toolbar } from './Toolbar';

type Props = {
  editor: TiptapEditor;
  isToolbarEnabled: boolean;
  runToolbarCommand: (editor: TiptapEditor, id: ToolbarCommandId) => boolean;
  setHasEditorWidgetFocus: (focused: boolean) => void;
  toolbarStatus: string;
  insertTable: {
    isInsertTablePopoverOpen: boolean;
    insertTableRows: string;
    insertTableCols: string;
    insertTableRowsInputRef: RefObject<HTMLInputElement | null>;
    setInsertTableRows: (value: string) => void;
    setInsertTableCols: (value: string) => void;
    clampTableDim: (value: string) => number;
    confirmInsertTable: (editor: TiptapEditor) => void;
    closeInsertTablePopover: () => void;
  };
  findReplace: {
    isFindPanelOpen: boolean;
    isReplaceMode: boolean;
    findQuery: string;
    replaceQuery: string;
    findMatches: Array<{ from: number; to: number }>;
    findCountText: string;
    findProgressText: string;
    findInputRef: RefObject<HTMLInputElement | null>;
    replaceInputRef: RefObject<HTMLInputElement | null>;
    openFindPanel: (mode: 'find' | 'replace') => void;
    closeFindPanel: () => void;
    setFindQuery: (value: string) => void;
    setReplaceQuery: (value: string) => void;
    goToPrevFindMatch: () => void;
    goToNextFindMatch: () => void;
    replaceOneActiveMatch: () => void;
    replaceAllActiveMatches: () => void;
  };
};

export function EditorShell({
  editor,
  isToolbarEnabled,
  runToolbarCommand,
  setHasEditorWidgetFocus,
  toolbarStatus,
  insertTable,
  findReplace,
}: Props) {
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
      <Toolbar
        editor={editor}
        isToolbarEnabled={isToolbarEnabled}
        runToolbarCommand={runToolbarCommand}
        isInsertTablePopoverOpen={insertTable.isInsertTablePopoverOpen}
        insertTableRows={insertTable.insertTableRows}
        insertTableCols={insertTable.insertTableCols}
        insertTableRowsInputRef={insertTable.insertTableRowsInputRef}
        setInsertTableRows={insertTable.setInsertTableRows}
        setInsertTableCols={insertTable.setInsertTableCols}
        clampTableDim={insertTable.clampTableDim}
        confirmInsertTable={insertTable.confirmInsertTable}
        closeInsertTablePopover={insertTable.closeInsertTablePopover}
        isFindPanelOpen={findReplace.isFindPanelOpen}
        isReplaceMode={findReplace.isReplaceMode}
        findQuery={findReplace.findQuery}
        replaceQuery={findReplace.replaceQuery}
        findMatchesCount={findReplace.findMatches.length}
        findCountText={findReplace.findCountText}
        findProgressText={findReplace.findProgressText}
        findInputRef={findReplace.findInputRef}
        replaceInputRef={findReplace.replaceInputRef}
        openFindPanel={findReplace.openFindPanel}
        closeFindPanel={findReplace.closeFindPanel}
        setFindQuery={findReplace.setFindQuery}
        setReplaceQuery={findReplace.setReplaceQuery}
        goToPrevFindMatch={findReplace.goToPrevFindMatch}
        goToNextFindMatch={findReplace.goToNextFindMatch}
        replaceOneActiveMatch={findReplace.replaceOneActiveMatch}
        replaceAllActiveMatches={findReplace.replaceAllActiveMatches}
        toolbarStatus={toolbarStatus}
      />
      <EditorContent editor={editor} className="flex-grow overflow-auto p-4" />
    </div>
  );
}
