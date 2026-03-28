import { describe, expect, it, vi } from 'vitest';
import type { EditorView } from '@tiptap/pm/view';
import { TOOLBAR_COMMANDS } from './constants';
import { createEditorKeyDownHandler } from '../extensions/keydownHandler';
import {
  clearNextPasteIntent,
  consumeNextPasteIntent,
} from '../integration/pasteIntentController';

describe('Editor table controls contracts', () => {
  it('keeps table operations out of toolbar command registry', () => {
    const ids = TOOLBAR_COMMANDS.map((item) => item.id);
    expect(ids).not.toContain('deleteTable');
    expect(ids).not.toContain('insertTable');
  });

  it('keydown handler does not intercept unrelated key events', () => {
    const handler = createEditorKeyDownHandler();
    const event = new KeyboardEvent('keydown', { key: 'a' });
    const view = {
      state: { selection: {} },
    } as unknown as EditorView;
    const handled = handler(view, event);
    expect(handled).toBe(false);
  });

  it('handles Cmd/Ctrl+S with preventDefault to avoid browser save dialog', () => {
    const handler = createEditorKeyDownHandler();
    const preventDefault = vi.fn();
    const event = {
      key: 's',
      metaKey: true,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      preventDefault,
    } as unknown as KeyboardEvent;
    const view = {
      state: { selection: {} },
    } as unknown as EditorView;

    const handled = handler(view, event);

    expect(handled).toBe(true);
    expect(preventDefault).toHaveBeenCalledTimes(1);
  });

  it('uses Cmd/Ctrl+Shift+V to arm one-shot plain paste intent', () => {
    const handler = createEditorKeyDownHandler();
    const preventDefault = vi.fn();
    const event = {
      key: 'v',
      metaKey: false,
      ctrlKey: true,
      altKey: false,
      shiftKey: true,
      preventDefault,
    } as unknown as KeyboardEvent;
    const view = {
      state: { selection: {} },
    } as unknown as EditorView;

    clearNextPasteIntent();

    const handled = handler(view, event);

    expect(handled).toBe(true);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(consumeNextPasteIntent()).toBe('plain');
  });
});
