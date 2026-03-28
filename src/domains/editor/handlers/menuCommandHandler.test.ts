import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Editor } from '@tiptap/react';
import { t } from '../../../shared/i18n';
import { createMenuCommandHandler } from './menuCommandHandler';
import { useNotificationStore } from '../../../state/slices/notificationSlice';
import { useStatusStore } from '../../../state/slices/statusSlice';

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
    useNotificationStore.getState().clearNotifications();
    useStatusStore.setState({
      status: 'idle',
      message: null,
      saveStatus: 'saved',
      lastSavedAt: null,
      saveError: null,
    });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    readClipboardPayloadMock.mockReset();
    insertClipboardTextMock.mockReset();
    insertClipboardHtmlMock.mockReset();
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
    expect(readClipboardPayloadMock).not.toHaveBeenCalled();
    expect(insertClipboardTextMock).not.toHaveBeenCalled();
    expect(insertClipboardHtmlMock).not.toHaveBeenCalled();
    expect(setStatus).not.toHaveBeenCalled();
  });

  it('uses explicit clipboard text insertion for plain paste entry', async () => {
    const setStatus = vi.fn();
    const execCommand = vi.fn(() => true);
    readClipboardPayloadMock.mockResolvedValue({
      html: '<p>rich</p>',
      text: '# heading',
    });

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
    expect(readClipboardPayloadMock).toHaveBeenCalledTimes(1);
    expect(insertClipboardTextMock).toHaveBeenCalledWith(
      editor,
      '# heading',
      'plain',
    );
    expect(insertClipboardHtmlMock).not.toHaveBeenCalled();
    expect(setStatus).not.toHaveBeenCalled();
  });

  it('uses html payload for normal paste fallback when native paste is unavailable', async () => {
    const setStatus = vi.fn();
    readClipboardPayloadMock.mockResolvedValue({
      html: '<p>rich</p>',
      text: 'rich',
    });

    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: vi.fn(() => false),
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

    expect(insertClipboardHtmlMock).toHaveBeenCalledWith(editor, '<p>rich</p>');
    expect(insertClipboardTextMock).not.toHaveBeenCalled();
    expect(setStatus).not.toHaveBeenCalled();
  });

  it('routes clipboard denial through level2 when native paste fallback fails', async () => {
    const setStatus = vi.fn();
    readClipboardPayloadMock.mockRejectedValue(new Error('denied'));

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

    expect(readClipboardPayloadMock).toHaveBeenCalledTimes(1);
    expect(setStatus).not.toHaveBeenCalled();
    expect(useNotificationStore.getState().level2Notification?.reason).toBe(
      t('status.menu.clipboardDenied'),
    );
    expect(useNotificationStore.getState().level2Notification?.source).toBe(
      'menu-edit-paste',
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
