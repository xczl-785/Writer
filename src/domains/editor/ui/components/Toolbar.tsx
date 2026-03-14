import type { Editor as TiptapEditor } from '@tiptap/react';
import type { RefObject } from 'react';
import { TOOLBAR_COMMANDS, type ToolbarCommandId } from '../../core/constants';
import { FindReplacePanel } from './FindReplacePanel';

type Props = {
  editor: TiptapEditor;
  isToolbarEnabled: boolean;
  runToolbarCommand: (editor: TiptapEditor, id: ToolbarCommandId) => boolean;
  isFindPanelOpen: boolean;
  isReplaceMode: boolean;
  findQuery: string;
  replaceQuery: string;
  findMatchesCount: number;
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
  toolbarStatus: string;
};

export function Toolbar({
  editor,
  isToolbarEnabled,
  runToolbarCommand,
  isFindPanelOpen,
  isReplaceMode,
  findQuery,
  replaceQuery,
  findMatchesCount,
  findCountText,
  findProgressText,
  findInputRef,
  replaceInputRef,
  openFindPanel,
  closeFindPanel,
  setFindQuery,
  setReplaceQuery,
  goToPrevFindMatch,
  goToNextFindMatch,
  replaceOneActiveMatch,
  replaceAllActiveMatches,
  toolbarStatus,
}: Props) {
  return (
    <div className="editor-toolbar" role="toolbar" aria-label="Editor toolbar">
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

      <FindReplacePanel
        isOpen={isFindPanelOpen}
        isReplaceMode={isReplaceMode}
        findQuery={findQuery}
        replaceQuery={replaceQuery}
        findMatchesCount={findMatchesCount}
        findCountText={findCountText}
        findProgressText={findProgressText}
        findInputRef={findInputRef}
        replaceInputRef={replaceInputRef}
        onOpenFind={() => openFindPanel('find')}
        onOpenReplace={() => openFindPanel('replace')}
        onClose={closeFindPanel}
        onFindQueryChange={setFindQuery}
        onReplaceQueryChange={setReplaceQuery}
        onPrev={goToPrevFindMatch}
        onNext={goToNextFindMatch}
        onReplaceOne={replaceOneActiveMatch}
        onReplaceAll={replaceAllActiveMatches}
      />

      <div className="editor-toolbar__status" aria-live="polite">
        {toolbarStatus}
      </div>
    </div>
  );
}
