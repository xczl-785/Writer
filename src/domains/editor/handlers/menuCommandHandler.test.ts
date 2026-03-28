import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Editor } from '@tiptap/react';
import { t } from '../../../shared/i18n';
import { createMenuCommandHandler } from './menuCommandHandler';

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

describe('createMenuCommandHandler', () => {
  const chain = {
    focus: vi.fn(),
    run: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    insertContent: vi.fn(),
    selectAll: vi.fn(),
    toggleUnderline: vi.fn(),
    toggleHighlight: vi.fn(),
  };

  const editor = {
    chain: vi.fn(() => chain),
  } as unknown as Editor;

  beforeEach(() => {
    vi.clearAllMocks();
    readClipboardTextMock.mockReset();
    insertClipboardTextMock.mockReset();
    chain.focus.mockReturnValue(chain);
    chain.run.mockReturnValue(true);
    chain.undo.mockReturnValue(chain);
    chain.redo.mockReturnValue(chain);
    chain.insertContent.mockReturnValue(chain);
    chain.selectAll.mockReturnValue(chain);
    chain.toggleUnderline.mockReturnValue(chain);
    chain.toggleHighlight.mockReturnValue(chain);
  });

  it('uses document paste command without clipboard read fallback', () => {
    const setStatus = vi.fn();
    const openFindPanel = vi.fn();
    const setOutlineOpen = vi.fn();
    const execCommand = vi.fn(() => true);
    const readText = vi.fn();

    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { readText },
    });

    const handler = createMenuCommandHandler(
      editor,
      { openFindPanel },
      setStatus,
      setOutlineOpen,
    );

    handler(
      new CustomEvent('writer:editor-command', {
        detail: { id: 'edit.paste' },
      }),
    );

    expect(execCommand).toHaveBeenCalledWith('paste');
    expect(readText).not.toHaveBeenCalled();
    expect(readClipboardTextMock).not.toHaveBeenCalled();
    expect(insertClipboardTextMock).not.toHaveBeenCalled();
    expect(setStatus).not.toHaveBeenCalled();
  });

  it('uses explicit clipboard text insertion for plain paste entry', async () => {
    const setStatus = vi.fn();
    const execCommand = vi.fn(() => true);
    readClipboardTextMock.mockResolvedValue('# heading');

    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    });

    const handler = createMenuCommandHandler(
      editor,
      { openFindPanel: vi.fn() },
      setStatus,
      vi.fn(),
    );

    handler(
      new CustomEvent('writer:editor-command', {
        detail: { id: 'edit.paste_plain' },
      }),
    );

    await Promise.resolve();

    expect(execCommand).not.toHaveBeenCalled();
    expect(readClipboardTextMock).toHaveBeenCalledTimes(1);
    expect(insertClipboardTextMock).toHaveBeenCalledWith(
      editor,
      '# heading',
      'plain',
    );
    expect(setStatus).not.toHaveBeenCalled();
  });

  it('reports clipboard denial when native paste command fallback also fails', async () => {
    const setStatus = vi.fn();
    readClipboardTextMock.mockRejectedValue(new Error('denied'));

    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: vi.fn(() => false),
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { readText: vi.fn() },
    });

    const handler = createMenuCommandHandler(
      editor,
      { openFindPanel: vi.fn() },
      setStatus,
      vi.fn(),
    );

    handler(
      new CustomEvent('writer:editor-command', {
        detail: { id: 'edit.paste' },
      }),
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(readClipboardTextMock).toHaveBeenCalledTimes(1);
    expect(setStatus).toHaveBeenCalledWith(
      'error',
      t('status.menu.clipboardDenied'),
    );
  });

  it('runs underline and highlight commands through editor chain', () => {
    const setStatus = vi.fn();
    const handler = createMenuCommandHandler(
      editor,
      { openFindPanel: vi.fn() },
      setStatus,
      vi.fn(),
    );

    handler(
      new CustomEvent('writer:editor-command', {
        detail: { id: 'format.underline' },
      }),
    );
    handler(
      new CustomEvent('writer:editor-command', {
        detail: { id: 'format.highlight' },
      }),
    );

    expect(chain.toggleUnderline).toHaveBeenCalled();
    expect(chain.toggleHighlight).toHaveBeenCalled();
    expect(setStatus).not.toHaveBeenCalled();
  });
});
