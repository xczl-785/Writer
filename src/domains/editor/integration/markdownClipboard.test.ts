import { describe, expect, it, vi } from 'vitest';
import { EditorState } from '@tiptap/pm/state';
import { schema as basicSchema } from '@tiptap/pm/schema-basic';
import { Slice } from '@tiptap/pm/model';
import {
  createMarkdownClipboardTextParser,
  createMarkdownClipboardTextSerializer,
  shouldSkipMarkdownParsingForSize,
} from './markdownClipboard';
import {
  clearNextPasteIntent,
  setNextPasteIntent,
} from './pasteIntentController';
import { markdownManager } from '../../../services/markdown/MarkdownService';

describe('markdownClipboard', () => {
  it('skips markdown parsing for oversized text', () => {
    expect(shouldSkipMarkdownParsingForSize('a'.repeat(50 * 1024 + 1))).toBe(
      true,
    );
  });

  it('parses markdown plain text into a non-empty slice', () => {
    const parser = createMarkdownClipboardTextParser();
    const state = EditorState.create({ schema: basicSchema });
    const view = { state } as never;

    const slice = parser('# Title', state.selection.$from, false, view);

    expect(slice).toBeInstanceOf(Slice);
    expect(slice.size).toBeGreaterThan(0);
    expect(slice.content.firstChild?.type.name).toBe('heading');
  });

  it('falls back to raw text insertion for plain paste bypass', () => {
    const parser = createMarkdownClipboardTextParser();
    const state = EditorState.create({ schema: basicSchema });
    const view = { state } as never;

    const slice = parser('# Title', state.selection.$from, true, view);

    expect(slice.eq(Slice.empty)).toBe(false);
    expect(slice.content.textBetween(0, slice.content.size, '\n\n')).toContain(
      '# Title',
    );
  });

  it('prefers writer-owned plain paste intent over parser plain flag', () => {
    const parser = createMarkdownClipboardTextParser();
    const state = EditorState.create({ schema: basicSchema });
    const view = { state } as never;

    clearNextPasteIntent();
    setNextPasteIntent('plain');

    const slice = parser('# Title', state.selection.$from, false, view);

    expect(slice.eq(Slice.empty)).toBe(false);
    expect(slice.content.textBetween(0, slice.content.size, '\n\n')).toContain(
      '# Title',
    );
    expect(slice.content.firstChild?.type.name).toBe('paragraph');
  });

  it('consumes writer-owned plain paste intent once without polluting next paste', () => {
    const parser = createMarkdownClipboardTextParser();
    const state = EditorState.create({ schema: basicSchema });
    const view = { state } as never;

    clearNextPasteIntent();
    setNextPasteIntent('plain');

    const plainSlice = parser('# Title', state.selection.$from, false, view);
    const normalSlice = parser('# Title', state.selection.$from, false, view);

    expect(plainSlice.content.firstChild?.type.name).toBe('paragraph');
    expect(normalSlice.content.firstChild?.type.name).toBe('heading');
  });

  it('falls back to raw text insertion for oversized content', () => {
    const parser = createMarkdownClipboardTextParser();
    const state = EditorState.create({ schema: basicSchema });
    const view = { state } as never;
    const text = 'a'.repeat(50 * 1024 + 1);

    const slice = parser(text, state.selection.$from, false, view);

    expect(slice.eq(Slice.empty)).toBe(false);
    expect(slice.content.textBetween(0, slice.content.size, '\n\n')).toContain(
      text,
    );
  });

  it('falls back to raw text insertion when markdown parsing throws', () => {
    const parser = createMarkdownClipboardTextParser();
    const state = EditorState.create({ schema: basicSchema });
    const view = { state } as never;
    const parseSpy = vi
      .spyOn(markdownManager, 'parse')
      .mockImplementation(() => {
        throw new Error('parse failed');
      });

    const slice = parser('**broken**', state.selection.$from, false, view);

    expect(slice.eq(Slice.empty)).toBe(false);
    expect(slice.content.textBetween(0, slice.content.size, '\n\n')).toContain(
      '**broken**',
    );

    parseSpy.mockRestore();
  });

  it('retries with dedented text when uniform indent causes sole codeBlock', () => {
    const parser = createMarkdownClipboardTextParser();
    const state = EditorState.create({ schema: basicSchema });
    const view = { state } as never;

    const indentedMarkdown = '    # Title\n    \n    some text';
    const slice = parser(indentedMarkdown, state.selection.$from, false, view);

    expect(slice.content.firstChild?.type.name).toBe('heading');
  });

  it('does not retry for fenced code block (no common indent)', () => {
    const parseSpy = vi.spyOn(markdownManager, 'parse');
    const parser = createMarkdownClipboardTextParser();
    const state = EditorState.create({ schema: basicSchema });
    const view = { state } as never;

    const fenced = '```\nfunction foo() {}\n```';

    // fenced code has no common indent → stripCommonIndent returns same text → no retry
    // basicSchema lacks codeBlock, so nodeFromJSON would throw;
    // we verify parse is called exactly once (no retry attempted)
    try {
      parser(fenced, state.selection.$from, false, view);
    } catch {
      // expected: basicSchema cannot instantiate codeBlock node
    }

    expect(parseSpy).toHaveBeenCalledTimes(1);
    parseSpy.mockRestore();
  });

  it('does not retry when text has no common indent to strip', () => {
    const parseSpy = vi.spyOn(markdownManager, 'parse');
    const parser = createMarkdownClipboardTextParser();
    const state = EditorState.create({ schema: basicSchema });
    const view = { state } as never;

    const noCommonIndent = '    only one indented line\nnot indented';

    // mixed indent → not sole codeBlock → no retry, parse called once
    try {
      parser(noCommonIndent, state.selection.$from, false, view);
    } catch {
      // expected: basicSchema cannot instantiate codeBlock node
    }

    expect(parseSpy).toHaveBeenCalledTimes(1);
    parseSpy.mockRestore();
  });

  it('retries with tab-indented text that causes sole codeBlock', () => {
    const parser = createMarkdownClipboardTextParser();
    const state = EditorState.create({ schema: basicSchema });
    const view = { state } as never;

    const tabIndented = '\t# Hello\n\t\n\tworld';
    const slice = parser(tabIndented, state.selection.$from, false, view);

    expect(slice.content.firstChild?.type.name).toBe('heading');
  });

  it('serializes selected content to markdown text', () => {
    const serializer = createMarkdownClipboardTextSerializer();
    const doc = basicSchema.node('doc', null, [
      basicSchema.node('heading', { level: 1 }, [basicSchema.text('Title')]),
      basicSchema.node('paragraph', null, [basicSchema.text('Body')]),
    ]);
    const slice = Slice.maxOpen(doc.content);

    const text = serializer(slice);

    expect(text).toContain('# Title');
    expect(text).toContain('Body');
  });
});
