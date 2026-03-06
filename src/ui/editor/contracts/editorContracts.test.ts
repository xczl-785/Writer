import { describe, expect, it } from 'vitest';
import type { Editor as TiptapEditor } from '@tiptap/react';
import {
  collectFindTextMatches,
  computeTypewriterTargetScrollTop,
  shouldActivateTypewriterAnchor,
} from '../domain';
import { createEditorLayoutModel } from '../core/EditorLayoutModel';

describe('editor contracts', () => {
  it('find-replace collects ordered matches from text nodes', () => {
    const editor = {
      state: {
        doc: {
          descendants: (visitor: (node: any, pos: number) => boolean) => {
            visitor({ isText: true, text: 'abc abc' }, 0);
            visitor({ isText: true, text: 'abc' }, 10);
          },
        },
      },
    } as unknown as TiptapEditor;

    const matches = collectFindTextMatches(editor, 'abc');
    expect(matches).toEqual([
      { from: 0, to: 3 },
      { from: 4, to: 7 },
      { from: 10, to: 13 },
    ]);
  });

  it('layout model stays aligned with existing visual constants', () => {
    const defaultLayout = createEditorLayoutModel('default');
    const minLayout = createEditorLayoutModel('min');

    expect(defaultLayout.maxContentWidth).toBe(850);
    expect(defaultLayout.contentPaddingTop).toBe(64);
    expect(defaultLayout.contentPaddingInline).toBe(32);

    expect(minLayout.contentPaddingTop).toBe(32);
    expect(minLayout.contentPaddingInline).toBe(16);
  });

  it('typewriter contract keeps cursor near 45% anchor when active', () => {
    expect(
      shouldActivateTypewriterAnchor({
        enabled: true,
        contentHeight: 1000,
        viewportHeight: 600,
      }),
    ).toBe(true);
    expect(
      computeTypewriterTargetScrollTop({
        currentScrollTop: 120,
        containerTop: 100,
        containerHeight: 800,
        cursorTop: 620,
        anchorRatio: 0.45,
      }),
    ).toBe(280);
  });
});

