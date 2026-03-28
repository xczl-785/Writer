import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Editor } from '@tiptap/react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { createContextMenuOpener } from './contextMenuHandler';
import {
  isMenuItem,
  type MenuItem,
} from '../../../shared/components/ContextMenu/contextMenuRegistry';

const readClipboardTextMock = vi.fn();
const insertClipboardTextMock = vi.fn();

vi.mock('../../../services/runtime/ClipboardTextReader', () => ({
  readClipboardText: () => readClipboardTextMock(),
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
    readClipboardTextMock.mockReset();
    insertClipboardTextMock.mockReset();
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
    expect(readClipboardTextMock).not.toHaveBeenCalled();
    expect(insertClipboardTextMock).not.toHaveBeenCalled();
  });

  it('exposes a separate plain paste context action', async () => {
    const execCommand = vi.fn(() => true);
    let capturedItems: MenuItem[] = [];
    readClipboardTextMock.mockResolvedValue('# heading');

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
    expect(readClipboardTextMock).toHaveBeenCalledTimes(1);
    expect(insertClipboardTextMock).toHaveBeenCalledWith(
      editor,
      '# heading',
      'plain',
    );
  });
});
