import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Highlight from '@tiptap/extension-highlight';
import type { Editor as TiptapReactEditor } from '@tiptap/react';
import {
  executeCopyAsMarkdown,
  executeCopyAsPlainText,
} from './copyCommandBridge';

vi.mock('../../../services/error/ErrorService', () => ({
  ErrorService: {
    handle: vi.fn(),
    log: vi.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeEditor(contentJSON: any): Editor {
  return new Editor({
    extensions: [
      StarterKit,
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: contentJSON,
  });
}

interface ClipboardWriteCall {
  entries: Array<{ mime: string; value: string }>;
}

interface ClipboardHarness {
  write: ReturnType<typeof vi.fn>;
  writeText: ReturnType<typeof vi.fn>;
  calls: ClipboardWriteCall[];
  textCalls: string[];
}

function installClipboardHarness(options?: {
  hasClipboardItem?: boolean;
  writeRejects?: boolean;
}): ClipboardHarness {
  const { hasClipboardItem = true, writeRejects = false } = options ?? {};
  const calls: ClipboardWriteCall[] = [];
  const textCalls: string[] = [];

  const write = vi.fn(async (items: unknown[]) => {
    if (writeRejects) throw new Error('write rejected');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const item of items as any[]) {
      const entries: Array<{ mime: string; value: string }> = [];
      for (const mime of item.types as string[]) {
        const blob: Blob = await item.getType(mime);
        entries.push({ mime, value: await blob.text() });
      }
      calls.push({ entries });
    }
  });

  const writeText = vi.fn(async (text: string) => {
    textCalls.push(text);
  });

  Object.defineProperty(globalThis.navigator, 'clipboard', {
    configurable: true,
    value: { write, writeText },
  });

  if (hasClipboardItem) {
    // Minimal ClipboardItem polyfill. Assign via defineProperty on
    // window so jsdom's `'ClipboardItem' in window` probe sees it.
    Object.defineProperty(window, 'ClipboardItem', {
      configurable: true,
      writable: true,
      value: class {
        private readonly payload: Record<string, Blob>;
        constructor(payload: Record<string, Blob>) {
          this.payload = payload;
        }
        get types(): string[] {
          return Object.keys(this.payload);
        }
        async getType(mime: string): Promise<Blob> {
          return this.payload[mime];
        }
      },
    });
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ('ClipboardItem' in window) delete (window as any).ClipboardItem;
  }

  return { write, writeText, calls, textCalls };
}

function uninstallClipboardHarness(): void {
  Object.defineProperty(globalThis.navigator, 'clipboard', {
    configurable: true,
    value: undefined,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ('ClipboardItem' in window) delete (window as any).ClipboardItem;
}

describe('copyCommandBridge', () => {
  let editor: Editor;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    editor?.destroy();
    uninstallClipboardHarness();
  });

  describe('executeCopyAsMarkdown', () => {
    it('writes both text/plain (markdown) and text/html', async () => {
      editor = makeEditor({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'hello ' },
              { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
            ],
          },
        ],
      });
      editor.commands.selectAll();
      const harness = installClipboardHarness();

      await executeCopyAsMarkdown(editor as unknown as TiptapReactEditor);

      expect(harness.write).toHaveBeenCalledTimes(1);
      expect(harness.calls).toHaveLength(1);
      const mimes = harness.calls[0].entries.map((e) => e.mime).sort();
      expect(mimes).toEqual(['text/html', 'text/plain']);
      const plain = harness.calls[0].entries.find(
        (e) => e.mime === 'text/plain',
      )!.value;
      const html = harness.calls[0].entries.find(
        (e) => e.mime === 'text/html',
      )!.value;
      expect(plain).toContain('**bold**');
      expect(html).toContain('<strong');
      expect(html).toContain('bold');
    });

    it('is a no-op when selection is empty but document is empty', async () => {
      editor = makeEditor({ type: 'doc', content: [] });
      const harness = installClipboardHarness();
      await executeCopyAsMarkdown(editor as unknown as TiptapReactEditor);
      expect(harness.write).not.toHaveBeenCalled();
      expect(harness.writeText).not.toHaveBeenCalled();
    });
  });

  describe('executeCopyAsPlainText', () => {
    it('writes only text/plain and not text/html', async () => {
      editor = makeEditor({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'hello ' },
              { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
            ],
          },
        ],
      });
      editor.commands.selectAll();
      const harness = installClipboardHarness();

      await executeCopyAsPlainText(editor as unknown as TiptapReactEditor);

      expect(harness.write).toHaveBeenCalledTimes(1);
      const mimes = harness.calls[0].entries.map((e) => e.mime);
      expect(mimes).toEqual(['text/plain']);
      expect(mimes).not.toContain('text/html');
      expect(harness.calls[0].entries[0].value).toBe('hello bold');
      expect(harness.calls[0].entries[0].value).not.toContain('**');
    });

    it('writes raw code content without fences when selection is a code block', async () => {
      editor = makeEditor({
        type: 'doc',
        content: [
          {
            type: 'codeBlock',
            content: [{ type: 'text', text: 'const x = 1' }],
          },
        ],
      });
      editor.commands.selectAll();
      const harness = installClipboardHarness();

      await executeCopyAsPlainText(editor as unknown as TiptapReactEditor);

      const plain = harness.calls[0].entries[0].value;
      expect(plain).toContain('const x = 1');
      expect(plain).not.toContain('```');
    });
  });

  describe('fallback behavior', () => {
    it('falls back to writeText when ClipboardItem is unavailable', async () => {
      editor = makeEditor({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'hello' }],
          },
        ],
      });
      editor.commands.selectAll();
      const harness = installClipboardHarness({ hasClipboardItem: false });

      await executeCopyAsMarkdown(editor as unknown as TiptapReactEditor);

      expect(harness.write).not.toHaveBeenCalled();
      expect(harness.writeText).toHaveBeenCalledTimes(1);
      expect(harness.textCalls[0]).toBe('hello');
    });

    it('reports failure via ErrorService when navigator.clipboard is missing', async () => {
      editor = makeEditor({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'hello' }],
          },
        ],
      });
      editor.commands.selectAll();
      const { ErrorService } =
        await import('../../../services/error/ErrorService');
      Object.defineProperty(globalThis.navigator, 'clipboard', {
        configurable: true,
        value: undefined,
      });

      await executeCopyAsPlainText(editor as unknown as TiptapReactEditor);

      expect(ErrorService.handle).toHaveBeenCalled();
    });
  });
});
