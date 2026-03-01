import { EditorContent, type Editor as TiptapEditor } from '@tiptap/react';
import type { RefObject } from 'react';
import type { MouseEvent, ReactNode } from 'react';
import type { ToolbarCommandId } from '../constants';
import { Toolbar } from './Toolbar';

type Props = {
  editor: TiptapEditor;
  isToolbarEnabled: boolean;
  runToolbarCommand: (editor: TiptapEditor, id: ToolbarCommandId) => boolean;
  setHasEditorWidgetFocus: (focused: boolean) => void;
  toolbarStatus: string;
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
  onEditorContextMenu: (event: MouseEvent) => void;
  bubbleMenu?: ReactNode;
  breadcrumb?: ReactNode;
};

export function EditorShell({
  editor,
  isToolbarEnabled,
  runToolbarCommand,
  setHasEditorWidgetFocus,
  toolbarStatus,
  findReplace,
  onEditorContextMenu,
  bubbleMenu,
  breadcrumb,
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
      {breadcrumb}
      <Toolbar
        editor={editor}
        isToolbarEnabled={isToolbarEnabled}
        runToolbarCommand={runToolbarCommand}
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
      {bubbleMenu}
      <EditorContent
        editor={editor}
        className="flex-grow overflow-auto p-4"
        onContextMenu={onEditorContextMenu}
      />
    </div>
  );
}
