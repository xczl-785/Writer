import { describe, expect, it, vi } from 'vitest';
import { createHandleDOMEvents, isVSCodeMarkdownPaste } from './pasteHandler';

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

describe('isVSCodeMarkdownPaste', () => {
  function fakeDataTransfer(data: Record<string, string>): DataTransfer {
    return { getData: (type: string) => data[type] ?? '' } as DataTransfer;
  }

  it('returns true when vscode-editor-data has mode "markdown"', () => {
    const dt = fakeDataTransfer({
      'vscode-editor-data': '{"version":1,"mode":"markdown"}',
    });
    expect(isVSCodeMarkdownPaste(dt)).toBe(true);
  });

  it('returns false when mode is not markdown', () => {
    const dt = fakeDataTransfer({
      'vscode-editor-data': '{"version":1,"mode":"typescript"}',
    });
    expect(isVSCodeMarkdownPaste(dt)).toBe(false);
  });

  it('returns false when vscode-editor-data is absent', () => {
    const dt = fakeDataTransfer({});
    expect(isVSCodeMarkdownPaste(dt)).toBe(false);
  });

  it('returns false when vscode-editor-data is malformed JSON', () => {
    const dt = fakeDataTransfer({ 'vscode-editor-data': 'not json' });
    expect(isVSCodeMarkdownPaste(dt)).toBe(false);
  });
});
