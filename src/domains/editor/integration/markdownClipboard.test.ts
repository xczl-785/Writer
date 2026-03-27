import { describe, expect, it, vi } from 'vitest';
import { EditorState } from '@tiptap/pm/state';
import { schema as basicSchema } from '@tiptap/pm/schema-basic';
import { Slice } from '@tiptap/pm/model';
import {
  createMarkdownClipboardTextParser,
  createMarkdownClipboardTextSerializer,
  shouldSkipMarkdownParsingForSize,
} from './markdownClipboard';
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
