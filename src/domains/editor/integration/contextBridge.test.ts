import { describe, expect, it, vi } from 'vitest';
import type { Editor } from '@tiptap/react';
import { openEditorContextMenu } from './contextBridge';

describe('openEditorContextMenu', () => {
  it('creates opener and delegates event', () => {
    const opener = vi.fn();
    const openerFactory = vi.fn(() => opener);
    const event = {
      preventDefault: vi.fn(),
    } as unknown as Parameters<typeof openEditorContextMenu>[0]['event'];

    openEditorContextMenu({
      event,
      editor: {} as Editor,
      contextMenu: { open: vi.fn() },
      copyText: vi.fn(async () => undefined),
      setStatus: vi.fn(),
      openerFactory,
    });

    expect(openerFactory).toHaveBeenCalledTimes(1);
    expect(opener).toHaveBeenCalledWith(event);
  });
});
