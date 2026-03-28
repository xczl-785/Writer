import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Editor } from '@tiptap/react';
import { t } from '../../../shared/i18n';
import { createMenuCommandHandler } from './menuCommandHandler';

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
    expect(setStatus).not.toHaveBeenCalled();
  });

  it('uses document paste command for plain paste entry', () => {
    const setStatus = vi.fn();
    const execCommand = vi.fn(() => true);

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

    expect(execCommand).toHaveBeenCalledWith('paste');
    expect(setStatus).not.toHaveBeenCalled();
  });

  it('reports clipboard denial when native paste command is unavailable', () => {
    const setStatus = vi.fn();

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
