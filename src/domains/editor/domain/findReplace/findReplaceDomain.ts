import { FIND_MATCH_LIMIT } from '../../constants';
import type { Editor as TiptapEditor } from '@tiptap/react';

export type FindTextMatch = {
  from: number;
  to: number;
};

export function collectFindTextMatches(
  editor: TiptapEditor,
  query: string,
): FindTextMatch[] {
  if (!query) return [];

  const matches: FindTextMatch[] = [];
  const term = query;

  editor.state.doc.descendants((node, pos) => {
    if (matches.length >= FIND_MATCH_LIMIT) return false;
    if (!node.isText || !node.text) return true;

    const text = node.text;
    let searchFrom = 0;
    while (matches.length < FIND_MATCH_LIMIT) {
      const index = text.indexOf(term, searchFrom);
      if (index === -1) break;
      const from = pos + index;
      matches.push({ from, to: from + term.length });
      searchFrom = index + Math.max(1, term.length);
    }

    return true;
  });

  return matches;
}

export function getActiveFindMatchIndex(
  matches: readonly FindTextMatch[],
  selectionFrom: number,
  selectionTo: number,
): number {
  if (matches.length === 0) return -1;
  const exact = matches.findIndex(
    (m) => m.from === selectionFrom && m.to === selectionTo,
  );
  if (exact !== -1) return exact;

  const anchor = selectionFrom;
  const containing = matches.findIndex(
    (m) => anchor >= m.from && anchor <= m.to,
  );
  return containing;
}
