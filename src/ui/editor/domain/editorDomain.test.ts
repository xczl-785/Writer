import { describe, expect, it } from 'vitest';
import type { Editor as TiptapEditor } from '@tiptap/react';
import {
  collectFindTextMatches,
  computeTypewriterTargetScrollTop,
  hasActiveOverlayInDom,
  isInsertTextLikeInput,
  isSlashTriggerChar,
  shouldActivateTypewriterAnchor,
} from './index';

describe('editor domain helpers', () => {
  it('collects find matches from text nodes', () => {
    const editor = {
      state: {
        doc: {
          descendants: (visitor: (node: any, pos: number) => boolean) => {
            visitor({ isText: true, text: 'hello world' }, 1);
            visitor({ isText: true, text: 'world hello' }, 20);
          },
        },
      },
    } as unknown as TiptapEditor;

    const matches = collectFindTextMatches(editor, 'hello');
    expect(matches).toHaveLength(2);
    expect(matches[0]).toEqual({ from: 1, to: 6 });
  });

  it('calculates typewriter anchor and activation gate', () => {
    expect(
      shouldActivateTypewriterAnchor({
        enabled: true,
        contentHeight: 1200,
        viewportHeight: 800,
      }),
    ).toBe(true);
    expect(
      computeTypewriterTargetScrollTop({
        currentScrollTop: 200,
        containerTop: 100,
        containerHeight: 800,
        cursorTop: 650,
        anchorRatio: 0.45,
      }),
    ).toBe(390);
  });

  it('provides slash input predicates', () => {
    expect(isSlashTriggerChar('/')).toBe(true);
    expect(isSlashTriggerChar('／')).toBe(true);
    expect(isSlashTriggerChar('a')).toBe(false);
    expect(isInsertTextLikeInput('insertText')).toBe(true);
    expect(isInsertTextLikeInput('insertFromComposition')).toBe(true);
    expect(isInsertTextLikeInput('deleteContentBackward')).toBe(false);
  });

  it('detects active overlay in dom', () => {
    const overlay = document.createElement('div');
    overlay.className = 'editor-find-panel';
    document.body.appendChild(overlay);
    expect(hasActiveOverlayInDom(null)).toBe(true);
    overlay.remove();
    expect(hasActiveOverlayInDom(null)).toBe(false);
  });
});

