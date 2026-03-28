import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Editor } from '@tiptap/react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { createContextMenuOpener } from './contextMenuHandler';
import {
  isMenuItem,
  type MenuItem,
} from '../../../shared/components/ContextMenu/contextMenuRegistry';

const readClipboardPayloadMock = vi.fn();
const insertClipboardTextMock = vi.fn();
const insertClipboardHtmlMock = vi.fn();

vi.mock('../../../services/runtime/ClipboardTextReader', () => ({
  readClipboardPayload: () => readClipboardPayloadMock(),
}));

vi.mock('../integration', async () => {
  const actual =
    await vi.importActual<typeof import('../integration')>('../integration');
  return {
    ...actual,
    insertClipboardText: (
      editor: Editor,
      text: string,
      intent: 'default' | 'plain',
    ) => insertClipboardTextMock(editor, text, intent),
    insertClipboardHtml: (editor: Editor, html: string) =>
      insertClipboardHtmlMock(editor, html),
  };
});

describe('createContextMenuOpener', () => {
  const chain = {
    focus: vi.fn(),
    run: vi.fn(),
  };

  const editor = {
    state: {
      selection: {
        empty: true,
        $from: {
          depth: 0,
          node: vi.fn(),
        },
      },
    },
    isActive: vi.fn(() => false),
    chain: vi.fn(() => chain),
    getText: vi.fn(() => 'doc'),
  } as unknown as Editor;

  beforeEach(() => {
    vi.clearAllMocks();
    readClipboardPayloadMock.mockReset();
    insertClipboardTextMock.mockReset();
    insertClipboardHtmlMock.mockReset();
    chain.focus.mockReturnValue(chain);
    chain.run.mockReturnValue(true);
  });

  it('pastes through document command without clipboard read fallback', () => {
    const execCommand = vi.fn(() => true);
    const readText = vi.fn();
    let capturedItems: MenuItem[] = [];

    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { readText },
    });

    const open = createContextMenuOpener(
      editor,
      {
        open: (_x, _y, items) => {
          capturedItems = items;
        },
      },
      vi.fn().mockResolvedValue(undefined),
      vi.fn(),
    );

    open({
      preventDefault: vi.fn(),
      clientX: 10,
      clientY: 20,
    } as unknown as ReactMouseEvent);

    const pasteItem = capturedItems.find(
      (item): item is Extract<MenuItem, { id: string }> =>
        isMenuItem(item) && item.id === 'paste',
    );
    expect(pasteItem).toBeDefined();

    pasteItem?.action();

    expect(execCommand).toHaveBeenCalledWith('paste');
    expect(readText).not.toHaveBeenCalled();
    expect(readClipboardPayloadMock).not.toHaveBeenCalled();
    expect(insertClipboardTextMock).not.toHaveBeenCalled();
    expect(insertClipboardHtmlMock).not.toHaveBeenCalled();
  });

  it('exposes a separate plain paste context action', async () => {
    const execCommand = vi.fn(() => true);
    let capturedItems: MenuItem[] = [];
    readClipboardPayloadMock.mockResolvedValue({
      html: '<p>rich</p>',
      text: '# heading',
    });

    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    });

    const open = createContextMenuOpener(
      editor,
      {
        open: (_x, _y, items) => {
          capturedItems = items;
        },
      },
      vi.fn().mockResolvedValue(undefined),
      vi.fn(),
    );

    open({
      preventDefault: vi.fn(),
      clientX: 10,
      clientY: 20,
    } as unknown as ReactMouseEvent);

    const plainPasteItem = capturedItems.find(
      (item): item is Extract<MenuItem, { id: string }> =>
        isMenuItem(item) && item.id === 'paste-plain',
    );

    expect(plainPasteItem).toBeDefined();

    plainPasteItem?.action();
    await Promise.resolve();

    expect(execCommand).not.toHaveBeenCalled();
    expect(readClipboardPayloadMock).toHaveBeenCalledTimes(1);
    expect(insertClipboardTextMock).toHaveBeenCalledWith(
      editor,
      '# heading',
      'plain',
    );
    expect(insertClipboardHtmlMock).not.toHaveBeenCalled();
  });
});
