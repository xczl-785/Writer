import { describe, expect, it, vi } from 'vitest';
import { consumeNextPasteIntent } from './pasteIntentController';
import { executePasteCommand } from './pasteCommandBridge';

describe('pasteCommandBridge', () => {
  it('uses native paste for default intent when available', async () => {
    const focusEditor = vi.fn();
    const execDocumentCommand = vi.fn(() => true);
    const readClipboardPayload = vi.fn();
    const insertClipboardText = vi.fn();
    const insertClipboardHtml = vi.fn();
    const setStatus = vi.fn();

    await executePasteCommand({
      focusEditor,
      execDocumentCommand,
      readClipboardPayload,
      insertClipboardText,
      insertClipboardHtml,
      setStatus,
      clipboardDeniedMessage: 'denied',
    });

    expect(execDocumentCommand).toHaveBeenCalledWith('paste');
    expect(readClipboardPayload).not.toHaveBeenCalled();
    expect(insertClipboardText).not.toHaveBeenCalled();
    expect(insertClipboardHtml).not.toHaveBeenCalled();
    expect(setStatus).not.toHaveBeenCalled();
  });

  it('falls back to explicit clipboard html insertion when native paste is unavailable', async () => {
    const focusEditor = vi.fn();
    const execDocumentCommand = vi.fn(() => false);
    const readClipboardPayload = vi
      .fn()
      .mockResolvedValue({ html: '<p>rich</p>', text: 'rich' });
    const insertClipboardText = vi.fn();
    const insertClipboardHtml = vi.fn();
    const setStatus = vi.fn();

    await executePasteCommand({
      focusEditor,
      execDocumentCommand,
      readClipboardPayload,
      insertClipboardText,
      insertClipboardHtml,
      setStatus,
      clipboardDeniedMessage: 'denied',
    });

    expect(execDocumentCommand).toHaveBeenCalledWith('paste');
    expect(readClipboardPayload).toHaveBeenCalledTimes(1);
    expect(insertClipboardHtml).toHaveBeenCalledWith('<p>rich</p>');
    expect(insertClipboardText).not.toHaveBeenCalled();
    expect(setStatus).not.toHaveBeenCalled();
  });

  it('uses explicit clipboard text insertion for plain intent', async () => {
    const focusEditor = vi.fn();
    const execDocumentCommand = vi.fn(() => true);
    const readClipboardPayload = vi
      .fn()
      .mockResolvedValue({ html: '<p>rich</p>', text: '# heading' });
    const insertClipboardText = vi.fn();
    const insertClipboardHtml = vi.fn();
    const setStatus = vi.fn();

    await executePasteCommand({
      intent: 'plain',
      focusEditor,
      execDocumentCommand,
      readClipboardPayload,
      insertClipboardText,
      insertClipboardHtml,
      setStatus,
      clipboardDeniedMessage: 'denied',
    });

    expect(execDocumentCommand).not.toHaveBeenCalled();
    expect(readClipboardPayload).toHaveBeenCalledTimes(1);
    expect(insertClipboardText).toHaveBeenCalledWith('# heading', 'plain');
    expect(insertClipboardHtml).not.toHaveBeenCalled();
    expect(setStatus).not.toHaveBeenCalled();
  });

  it('reports clipboard denial and clears plain intent when explicit read fails', async () => {
    const focusEditor = vi.fn();
    const execDocumentCommand = vi.fn(() => false);
    const readClipboardPayload = vi.fn().mockRejectedValue(new Error('denied'));
    const insertClipboardText = vi.fn();
    const insertClipboardHtml = vi.fn();
    const setStatus = vi.fn();

    await executePasteCommand({
      intent: 'plain',
      focusEditor,
      execDocumentCommand,
      readClipboardPayload,
      insertClipboardText,
      insertClipboardHtml,
      setStatus,
      clipboardDeniedMessage: 'denied',
    });

    expect(insertClipboardText).not.toHaveBeenCalled();
    expect(insertClipboardHtml).not.toHaveBeenCalled();
    expect(setStatus).toHaveBeenCalledWith('error', 'denied');
    expect(consumeNextPasteIntent()).toBe('default');
  });
});
