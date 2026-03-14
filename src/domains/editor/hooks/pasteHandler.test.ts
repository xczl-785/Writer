import { describe, expect, it, vi } from 'vitest';
import { createHandleDOMEvents } from './pasteHandler';

describe('createHandleDOMEvents', () => {
  it('forwards paste event to handler and does not swallow event', () => {
    const handlePaste = vi.fn().mockReturnValue(true);
    const handlers = createHandleDOMEvents(handlePaste);

    const event = { type: 'paste' } as ClipboardEvent;
    const result = handlers.paste?.({} as never, event);

    expect(handlePaste).toHaveBeenCalledWith(event);
    expect(result).toBe(false);
  });

  it('returns false when handler does not handle event', () => {
    const handlePaste = vi.fn().mockReturnValue(false);
    const handlers = createHandleDOMEvents(handlePaste);

    const event = { type: 'paste' } as ClipboardEvent;
    const result = handlers.paste?.({} as never, event);

    expect(result).toBe(false);
  });
});
