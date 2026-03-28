import { beforeEach, describe, expect, it, vi } from 'vitest';
import { menuCommandBus } from '../../ui/commands/menuCommandBus';
import { registerEditCommands } from './editCommands';

describe('registerEditCommands', () => {
  let cleanup: (() => void) | null = null;

  beforeEach(() => {
    cleanup?.();
    cleanup = null;
  });

  it('registers a separate plain paste editor command', () => {
    const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');
    cleanup = registerEditCommands();

    expect(menuCommandBus.dispatch('menu.edit.paste_plain')).toBe(true);

    expect(dispatchEventSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { id: 'edit.paste_plain' },
      }),
    );

    cleanup();
    cleanup = null;
    dispatchEventSpy.mockRestore();
  });
});
