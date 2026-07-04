import type { Editor } from '@tiptap/react';
import {
  createMenuCommandHandler,
  type MenuCommandHandler,
  type MenuImageAction,
} from '../handlers/menuCommandHandler';

type FindReplacePort = { openFindPanel: (mode: 'find' | 'replace') => void };
type SetStatus = (status: 'idle' | 'error', message: string) => void;
type SetOutlineOpen = (value: boolean | ((prev: boolean) => boolean)) => void;

type MenuHandlerFactory = (
  editor: Editor,
  findReplace: FindReplacePort,
  setStatus: SetStatus,
  setOutlineOpen: SetOutlineOpen,
  options?: { imageAction?: MenuImageAction },
) => MenuCommandHandler;

type AttachEditorMenuBridgeArgs = {
  editor: Editor;
  findReplace: FindReplacePort;
  setStatus: SetStatus;
  setOutlineOpen: SetOutlineOpen;
  imageAction?: MenuImageAction;
  handlerFactory?: MenuHandlerFactory;
};

export function attachEditorMenuBridge({
  editor,
  findReplace,
  setStatus,
  setOutlineOpen,
  imageAction,
  handlerFactory = createMenuCommandHandler,
}: AttachEditorMenuBridgeArgs): () => void {
  const onMenuCommand = handlerFactory(
    editor,
    findReplace,
    setStatus,
    setOutlineOpen,
    { imageAction },
  );
  window.addEventListener(
    'writer:editor-command',
    onMenuCommand as EventListener,
  );

  return () => {
    window.removeEventListener(
      'writer:editor-command',
      onMenuCommand as EventListener,
    );
  };
}
