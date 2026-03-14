import { describe, expect, it } from 'vitest';
import type { Editor as TiptapEditor } from '@tiptap/react';
import { collectFindTextMatches } from '../domain';
import { FIND_MATCH_LIMIT } from './constants';
import { EDITOR_CONFIG } from '../../../config/editor';

describe('Editor find and replace contracts', () => {
  it('respects configured find match limit', () => {
    expect(FIND_MATCH_LIMIT).toBe(EDITOR_CONFIG.findReplace.maxMatches);
  });

  it('collects matches in document order and caps by limit', () => {
    const editor = {
      state: {
        doc: {
          descendants: (visitor: (node: any, pos: number) => boolean) => {
            const line = 'x '.repeat(FIND_MATCH_LIMIT + 8);
            visitor({ isText: true, text: line }, 0);
          },
        },
      },
    } as unknown as TiptapEditor;

    const matches = collectFindTextMatches(editor, 'x');
    expect(matches.length).toBe(FIND_MATCH_LIMIT);
    expect(matches[0]).toEqual({ from: 0, to: 1 });
  });
});
