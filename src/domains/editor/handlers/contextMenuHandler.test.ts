import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Editor } from '@tiptap/react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { createContextMenuOpener } from './contextMenuHandler';
import {
  isMenuItem,
  type MenuItem,
} from '../../../shared/components/ContextMenu/contextMenuRegistry';

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
  });
});
