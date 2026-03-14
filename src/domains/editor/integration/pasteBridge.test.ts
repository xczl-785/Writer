import { describe, expect, it, vi } from 'vitest';
import type { Editor as TiptapEditor } from '@tiptap/react';
import { createEditorPasteDOMEvents } from './pasteBridge';

describe('createEditorPasteDOMEvents', () => {
  it('forwards paste events with current editor ref', () => {
    const editorRef = { current: { id: 'e1' } as unknown as TiptapEditor };
    const handlePaste = vi.fn().mockReturnValue(false);

    const handlers = createEditorPasteDOMEvents(handlePaste, editorRef);
    const event = {} as ClipboardEvent;
    const handled = handlers.paste({}, event);

    expect(handled).toBe(false);
    expect(handlePaste).toHaveBeenCalledWith(event, editorRef.current);
  });
});
