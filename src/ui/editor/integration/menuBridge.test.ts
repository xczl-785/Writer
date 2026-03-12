import { describe, expect, it, vi } from 'vitest';
import type { Editor } from '@tiptap/react';
import { attachEditorMenuBridge } from './menuBridge';

describe('attachEditorMenuBridge', () => {
  it('registers and unregisters writer editor command listener', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const handler = vi.fn();
    const handlerFactory = vi.fn(() => handler);

    const detach = attachEditorMenuBridge({
      editor: {} as Editor,
      findReplace: { openFindPanel: vi.fn() },
      setStatus: vi.fn(),
      setOutlineOpen: vi.fn(),
      handlerFactory,
    });

    expect(addSpy).toHaveBeenCalledWith(
      'writer:editor-command',
      handler as EventListener,
    );

    detach();

    expect(removeSpy).toHaveBeenCalledWith(
      'writer:editor-command',
      handler as EventListener,
    );
  });
});
