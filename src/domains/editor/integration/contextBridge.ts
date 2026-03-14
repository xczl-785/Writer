import type { MouseEvent as ReactMouseEvent } from 'react';
import type { Editor } from '@tiptap/react';
import {
  createContextMenuOpener,
  type ContextMenuOpener,
} from '../handlers/contextMenuHandler';
import type { MenuItem } from '../../components/ContextMenu/contextMenuRegistry';

type ContextMenuPort = {
  open: (x: number, y: number, items: MenuItem[]) => void;
};

type ContextOpenerFactory = (
  editor: Editor,
  contextMenu: ContextMenuPort,
  copyText: (text: string, successMessage: string) => Promise<void>,
  setStatus: (status: 'idle' | 'error', message: string) => void,
) => ContextMenuOpener;

type OpenEditorContextMenuArgs = {
  event: ReactMouseEvent;
  editor: Editor;
  contextMenu: ContextMenuPort;
  copyText: (text: string, successMessage: string) => Promise<void>;
  setStatus: (status: 'idle' | 'error', message: string) => void;
  openerFactory?: ContextOpenerFactory;
};

export function openEditorContextMenu({
  event,
  editor,
  contextMenu,
  copyText,
  setStatus,
  openerFactory = createContextMenuOpener,
}: OpenEditorContextMenuArgs): void {
  const opener = openerFactory(editor, contextMenu, copyText, setStatus);
  opener(event);
}
