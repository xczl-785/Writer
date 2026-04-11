import { describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Highlight from '@tiptap/extension-highlight';
import { Slice } from '@tiptap/pm/model';
import { TextSelection } from '@tiptap/pm/state';
import {
  containsStructuralNode,
  createSmartClipboardTextSerializer,
  isSelectionWhollyInsideStructuralBlock,
  isSliceJustOneStructuralBlock,
  serializeSliceAsMarkdown,
  serializeSliceAsPlainText,
  STRUCTURAL_NODE_TYPES,
  STRUCTURAL_MARK_TYPES,
} from './smartClipboardSerializer';

/**
 * Tests for capability `markdown-clipboard` CR-013 ~ CR-015.
 *
 * Policy: the `text/plain` channel carries Markdown source iff the
 * selection contains any structural node (list, code block, table,
 * blockquote, hr, inline code). Otherwise plain text.
 */

function makeEditor(contentJSON: unknown): Editor {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    content: contentJSON as any,
  });
}

function wholeDocSlice(editor: Editor): Slice {
  const { doc } = editor.state;
  return new Slice(doc.content, 0, 0);
}

describe('smartClipboardSerializer', () => {
  describe('whitelist constants', () => {
    it('lists block structural node types', () => {
      expect(STRUCTURAL_NODE_TYPES.has('bulletList')).toBe(true);
      expect(STRUCTURAL_NODE_TYPES.has('orderedList')).toBe(true);
      expect(STRUCTURAL_NODE_TYPES.has('taskList')).toBe(true);
      expect(STRUCTURAL_NODE_TYPES.has('codeBlock')).toBe(true);
      expect(STRUCTURAL_NODE_TYPES.has('blockquote')).toBe(true);
      expect(STRUCTURAL_NODE_TYPES.has('horizontalRule')).toBe(true);
      expect(STRUCTURAL_NODE_TYPES.has('table')).toBe(true);
      expect(STRUCTURAL_NODE_TYPES.has('tableRow')).toBe(true);
      expect(STRUCTURAL_NODE_TYPES.has('tableCell')).toBe(true);
      expect(STRUCTURAL_NODE_TYPES.has('tableHeader')).toBe(true);
    });

    it('excludes paragraph/heading/hardBreak and visual marks', () => {
      expect(STRUCTURAL_NODE_TYPES.has('paragraph')).toBe(false);
      expect(STRUCTURAL_NODE_TYPES.has('heading')).toBe(false);
      expect(STRUCTURAL_NODE_TYPES.has('hardBreak')).toBe(false);
      expect(STRUCTURAL_MARK_TYPES.has('bold')).toBe(false);
      expect(STRUCTURAL_MARK_TYPES.has('italic')).toBe(false);
      expect(STRUCTURAL_MARK_TYPES.has('link')).toBe(false);
      expect(STRUCTURAL_MARK_TYPES.has('highlight')).toBe(false);
    });

    it('includes inline code mark', () => {
      expect(STRUCTURAL_MARK_TYPES.has('code')).toBe(true);
    });
  });

  describe('containsStructuralNode', () => {
    it('returns false for a plain paragraph with bold', () => {
      const editor = makeEditor({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'hello ' },
              {
                type: 'text',
                text: 'world',
                marks: [{ type: 'bold' }],
              },
            ],
          },
        ],
      });
      expect(containsStructuralNode(wholeDocSlice(editor))).toBe(false);
      editor.destroy();
    });

    it('returns false for a heading', () => {
      const editor = makeEditor({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Title' }],
          },
        ],
      });
      expect(containsStructuralNode(wholeDocSlice(editor))).toBe(false);
      editor.destroy();
    });

    it('returns true for a bullet list', () => {
      const editor = makeEditor({
        type: 'doc',
        content: [
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'item' }],
                  },
                ],
              },
            ],
          },
        ],
      });
      expect(containsStructuralNode(wholeDocSlice(editor))).toBe(true);
      editor.destroy();
    });

    it('returns true for a task list', () => {
      const editor = makeEditor({
        type: 'doc',
        content: [
          {
            type: 'taskList',
            content: [
              {
                type: 'taskItem',
                attrs: { checked: false },
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'todo' }],
                  },
                ],
              },
            ],
          },
        ],
      });
      expect(containsStructuralNode(wholeDocSlice(editor))).toBe(true);
      editor.destroy();
    });

    it('returns true for a code block', () => {
      const editor = makeEditor({
        type: 'doc',
        content: [
          {
            type: 'codeBlock',
            content: [{ type: 'text', text: 'let x = 1' }],
          },
        ],
      });
      expect(containsStructuralNode(wholeDocSlice(editor))).toBe(true);
      editor.destroy();
    });

    it('returns true for a blockquote', () => {
      const editor = makeEditor({
        type: 'doc',
        content: [
          {
            type: 'blockquote',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'quoted' }],
              },
            ],
          },
        ],
      });
      expect(containsStructuralNode(wholeDocSlice(editor))).toBe(true);
      editor.destroy();
    });

    it('returns true for a horizontal rule', () => {
      const editor = makeEditor({
        type: 'doc',
        content: [{ type: 'horizontalRule' }],
      });
      expect(containsStructuralNode(wholeDocSlice(editor))).toBe(true);
      editor.destroy();
    });

    it('returns true for a paragraph containing inline code', () => {
      const editor = makeEditor({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'call ' },
              {
                type: 'text',
                text: 'foo()',
                marks: [{ type: 'code' }],
              },
            ],
          },
        ],
      });
      expect(containsStructuralNode(wholeDocSlice(editor))).toBe(true);
      editor.destroy();
    });

    it('returns true for a table', () => {
      const editor = makeEditor({
        type: 'doc',
        content: [
          {
            type: 'table',
            content: [
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableHeader',
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'a' }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });
      expect(containsStructuralNode(wholeDocSlice(editor))).toBe(true);
      editor.destroy();
    });
  });

  describe('serializeSliceAsPlainText', () => {
    it('strips bold marks from a single paragraph', () => {
      const editor = makeEditor({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'hello ' },
              { type: 'text', text: 'world', marks: [{ type: 'bold' }] },
            ],
          },
        ],
      });
      const text = serializeSliceAsPlainText(wholeDocSlice(editor));
      expect(text).toBe('hello world');
      expect(text).not.toContain('**');
      editor.destroy();
    });

    it('joins two paragraphs with a blank line', () => {
      const editor = makeEditor({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'first' }],
          },
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'second' }],
          },
        ],
      });
      expect(serializeSliceAsPlainText(wholeDocSlice(editor))).toBe(
        'first\n\nsecond',
      );
      editor.destroy();
    });

    it('drops heading syntax and keeps visible text only', () => {
      const editor = makeEditor({
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Chapter One' }],
          },
        ],
      });
      const text = serializeSliceAsPlainText(wholeDocSlice(editor));
      expect(text).toBe('Chapter One');
      expect(text).not.toContain('#');
      editor.destroy();
    });

    it('renders hardBreak as a single newline', () => {
      const editor = makeEditor({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'line1' },
              { type: 'hardBreak' },
              { type: 'text', text: 'line2' },
            ],
          },
        ],
      });
      expect(serializeSliceAsPlainText(wholeDocSlice(editor))).toBe(
        'line1\nline2',
      );
      editor.destroy();
    });

    it('strips link marks but keeps the visible anchor text', () => {
      const editor = makeEditor({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'see ' },
              {
                type: 'text',
                text: 'docs',
                marks: [
                  { type: 'link', attrs: { href: 'https://example.com' } },
                ],
              },
            ],
          },
        ],
      });
      const text = serializeSliceAsPlainText(wholeDocSlice(editor));
      expect(text).toBe('see docs');
      expect(text).not.toContain('[');
      expect(text).not.toContain('http');
      editor.destroy();
    });
  });

  describe('createSmartClipboardTextSerializer', () => {
    const serializer = createSmartClipboardTextSerializer();

    it('routes a bold-only paragraph to plain text', () => {
      const editor = makeEditor({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'emphasized', marks: [{ type: 'bold' }] },
            ],
          },
        ],
      });
      const output = serializer(wholeDocSlice(editor));
      expect(output).toBe('emphasized');
      expect(output).not.toContain('**');
      editor.destroy();
    });

    // The tests below use a "preamble paragraph + structural block"
    // doc shape so the whole-doc slice has >1 top-level children.
    // That prevents Detector A (slice wraps exactly one structural
    // block → plain text) from firing and routes through the legacy
    // fallback, which is still the right path when the user's
    // selection genuinely crosses block boundaries.
    const preamble = {
      type: 'paragraph',
      content: [{ type: 'text', text: 'preamble' }],
    } as const;

    it('routes a bullet list to Markdown with list prefixes', () => {
      const editor = makeEditor({
        type: 'doc',
        content: [
          preamble,
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'alpha' }],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'beta' }],
                  },
                ],
              },
            ],
          },
        ],
      });
      const output = serializer(wholeDocSlice(editor));
      expect(output).toContain('alpha');
      expect(output).toContain('beta');
      expect(output).toMatch(/[-*]\s/);
      editor.destroy();
    });

    it('routes an ordered list to Markdown with numeric prefixes', () => {
      const editor = makeEditor({
        type: 'doc',
        content: [
          preamble,
          {
            type: 'orderedList',
            attrs: { start: 1 },
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'one' }],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'two' }],
                  },
                ],
              },
            ],
          },
        ],
      });
      const output = serializer(wholeDocSlice(editor));
      expect(output).toMatch(/1\.\s*one/);
      expect(output).toMatch(/2\.\s*two/);
      editor.destroy();
    });

    it('routes a code block to Markdown with fences', () => {
      const editor = makeEditor({
        type: 'doc',
        content: [
          preamble,
          {
            type: 'codeBlock',
            attrs: { language: null },
            content: [{ type: 'text', text: 'const x = 1' }],
          },
        ],
      });
      const output = serializer(wholeDocSlice(editor));
      expect(output).toContain('```');
      expect(output).toContain('const x = 1');
      editor.destroy();
    });

    it('routes a paragraph with inline code to Markdown (CR-013 D2)', () => {
      const editor = makeEditor({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'call ' },
              { type: 'text', text: 'fn()', marks: [{ type: 'code' }] },
            ],
          },
        ],
      });
      const output = serializer(wholeDocSlice(editor));
      expect(output).toContain('`fn()`');
      editor.destroy();
    });

    it('routes a blockquote to Markdown with > prefix', () => {
      const editor = makeEditor({
        type: 'doc',
        content: [
          preamble,
          {
            type: 'blockquote',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'a famous line' }],
              },
            ],
          },
        ],
      });
      const output = serializer(wholeDocSlice(editor));
      expect(output).toMatch(/^>\s+a famous line/m);
      editor.destroy();
    });

    it('routes a horizontal rule to Markdown', () => {
      const editor = makeEditor({
        type: 'doc',
        content: [preamble, { type: 'horizontalRule' }],
      });
      const output = serializer(wholeDocSlice(editor));
      expect(output).toMatch(/---|\*\*\*|___/);
      editor.destroy();
    });

    it('routes a table to Markdown with pipe syntax', () => {
      const editor = makeEditor({
        type: 'doc',
        content: [
          preamble,
          {
            type: 'table',
            content: [
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableHeader',
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'h1' }],
                      },
                    ],
                  },
                  {
                    type: 'tableHeader',
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'h2' }],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'a' }],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'b' }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });
      const output = serializer(wholeDocSlice(editor));
      expect(output).toContain('|');
      expect(output).toContain('h1');
      expect(output).toContain('h2');
      editor.destroy();
    });

    it('returns empty string for an empty slice', () => {
      const editor = makeEditor({ type: 'doc', content: [] });
      const output = serializer(wholeDocSlice(editor));
      expect(output).toBe('');
      editor.destroy();
    });
  });

  describe('serializeSliceAsMarkdown', () => {
    it('wraps slice content as a doc and delegates to markdownManager', () => {
      const editor = makeEditor({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'emphasized',
                marks: [{ type: 'bold' }],
              },
            ],
          },
        ],
      });
      expect(serializeSliceAsMarkdown(wholeDocSlice(editor))).toContain(
        '**emphasized**',
      );
      editor.destroy();
    });
  });

  /**
   * Tests for capability `markdown-clipboard` CR-013 single-block
   * refinement (FIX-CODE-BLOCK-COPY.md). These cover the two new
   * Detectors and the refined serializer routing:
   *
   *   - Detector A (`isSliceJustOneStructuralBlock`)
   *   - Detector B (`isSelectionWhollyInsideStructuralBlock`)
   *   - `createSmartClipboardTextSerializer(getEditorState)` routing
   *     through both detectors with legacy fallback
   */
  describe('single-block refinement (CR-013 revision)', () => {
    function findFirstNodePos(
      editor: Editor,
      typeName: string,
    ): { pos: number; size: number } {
      let hit: { pos: number; size: number } | null = null;
      editor.state.doc.descendants((node, pos) => {
        if (hit) return false;
        if (node.type.name === typeName) {
          hit = { pos, size: node.nodeSize };
          return false;
        }
        return true;
      });
      if (!hit) {
        throw new Error(`node type "${typeName}" not found in doc`);
      }
      return hit;
    }

    it('T1: slice containing exactly one codeBlock → isSliceJustOneStructuralBlock is true', () => {
      const editor = makeEditor({
        type: 'doc',
        content: [
          {
            type: 'codeBlock',
            content: [{ type: 'text', text: 'hello\nworld' }],
          },
        ],
      });
      const { pos, size } = findFirstNodePos(editor, 'codeBlock');
      const slice = editor.state.doc.slice(pos, pos + size);
      expect(isSliceJustOneStructuralBlock(slice)).toBe(true);
      editor.destroy();
    });

    it('T2: slice containing [paragraph, codeBlock] → isSliceJustOneStructuralBlock is false', () => {
      const editor = makeEditor({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'intro' }],
          },
          {
            type: 'codeBlock',
            content: [{ type: 'text', text: 'code' }],
          },
        ],
      });
      const slice = new Slice(editor.state.doc.content, 0, 0);
      expect(isSliceJustOneStructuralBlock(slice)).toBe(false);
      editor.destroy();
    });

    it('T3: selection fully inside a codeBlock → isSelectionWhollyInsideStructuralBlock is true', () => {
      const editor = makeEditor({
        type: 'doc',
        content: [
          {
            type: 'codeBlock',
            content: [{ type: 'text', text: 'fn main() {}' }],
          },
        ],
      });
      const { pos } = findFirstNodePos(editor, 'codeBlock');
      // codeBlock start = pos + 1, end = pos + size - 1
      const start = pos + 1;
      const end = pos + editor.state.doc.nodeAt(pos)!.nodeSize - 1;
      const selection = TextSelection.create(editor.state.doc, start, end);
      expect(isSelectionWhollyInsideStructuralBlock(selection)).toBe(true);
      editor.destroy();
    });

    it('T4: selection spanning two separate blockquotes → isSelectionWhollyInsideStructuralBlock is false', () => {
      const editor = makeEditor({
        type: 'doc',
        content: [
          {
            type: 'blockquote',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'first quote' }],
              },
            ],
          },
          {
            type: 'blockquote',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'second quote' }],
              },
            ],
          },
        ],
      });
      // Select from inside first blockquote to inside second blockquote.
      // The two blockquotes are siblings of the doc, so their shared
      // ancestor is the doc root — not a structural node.
      const from = 4; // inside first paragraph
      const to = editor.state.doc.content.size - 4; // inside second paragraph
      const selection = TextSelection.create(editor.state.doc, from, to);
      expect(isSelectionWhollyInsideStructuralBlock(selection)).toBe(false);
      editor.destroy();
    });

    it('T5: selection spanning two paragraphs inside the same blockquote → true', () => {
      const editor = makeEditor({
        type: 'doc',
        content: [
          {
            type: 'blockquote',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'line one' }],
              },
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'line two' }],
              },
            ],
          },
        ],
      });
      // Select across both paragraphs inside the single blockquote.
      const from = 3; // inside first paragraph
      const to = editor.state.doc.content.size - 3; // inside second paragraph
      const selection = TextSelection.create(editor.state.doc, from, to);
      expect(isSelectionWhollyInsideStructuralBlock(selection)).toBe(true);
      editor.destroy();
    });

    it('T6: serializer with injected state → codeBlock interior selection emits plain code', () => {
      const editor = makeEditor({
        type: 'doc',
        content: [
          {
            type: 'codeBlock',
            content: [{ type: 'text', text: 'const x = 1' }],
          },
        ],
      });
      const { pos } = findFirstNodePos(editor, 'codeBlock');
      const start = pos + 1;
      const end = pos + editor.state.doc.nodeAt(pos)!.nodeSize - 1;
      editor.view.dispatch(
        editor.state.tr.setSelection(
          TextSelection.create(editor.state.doc, start, end),
        ),
      );
      const serializer = createSmartClipboardTextSerializer(() => editor.state);
      const slice = editor.state.selection.content();
      const output = serializer(slice);
      expect(output).toContain('const x = 1');
      expect(output).not.toContain('```');
      editor.destroy();
    });

    it('T7: serializer with injected state → blockquote interior selection emits plain text (no >)', () => {
      const editor = makeEditor({
        type: 'doc',
        content: [
          {
            type: 'blockquote',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'a famous line' }],
              },
            ],
          },
        ],
      });
      // Select a substring inside the blockquote's paragraph. The
      // exact range does not matter — Detector B only cares that
      // both endpoints share a structural ancestor.
      const from = 4;
      const to = 10;
      editor.view.dispatch(
        editor.state.tr.setSelection(
          TextSelection.create(editor.state.doc, from, to),
        ),
      );
      const serializer = createSmartClipboardTextSerializer(() => editor.state);
      const slice = editor.state.selection.content();
      const output = serializer(slice);
      // The blockquote's `> ` prefix must NOT appear.
      expect(output).not.toContain('> ');
      // Whatever was projected must be a non-empty substring of the
      // blockquote's visible text.
      expect(output.length).toBeGreaterThan(0);
      expect('a famous line').toContain(output);
      editor.destroy();
    });

    it('T8: serializer with injected state → listItem interior selection emits plain text (no -)', () => {
      const editor = makeEditor({
        type: 'doc',
        content: [
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'alpha beta gamma' }],
                  },
                ],
              },
            ],
          },
        ],
      });
      // Select a few words inside the single list item's paragraph.
      const from = 5;
      const to = 10;
      editor.view.dispatch(
        editor.state.tr.setSelection(
          TextSelection.create(editor.state.doc, from, to),
        ),
      );
      const serializer = createSmartClipboardTextSerializer(() => editor.state);
      const slice = editor.state.selection.content();
      const output = serializer(slice);
      // The output must not start with "- " (list marker).
      expect(output.trimStart().startsWith('- ')).toBe(false);
      expect(output.trimStart().startsWith('* ')).toBe(false);
      editor.destroy();
    });

    it('T9: serializer with injected state → tableCell interior selection emits plain text (no pipe)', () => {
      const editor = makeEditor({
        type: 'doc',
        content: [
          {
            type: 'table',
            content: [
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableHeader',
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'h1' }],
                      },
                    ],
                  },
                  {
                    type: 'tableHeader',
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'h2' }],
                      },
                    ],
                  },
                ],
              },
              {
                type: 'tableRow',
                content: [
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'cell content' }],
                      },
                    ],
                  },
                  {
                    type: 'tableCell',
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'other' }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      });
      // Find a tableCell's inner paragraph and select a few chars.
      let cellPos = -1;
      editor.state.doc.descendants((node, pos) => {
        if (cellPos >= 0) return false;
        if (node.type.name === 'tableCell') {
          cellPos = pos;
          return false;
        }
        return true;
      });
      expect(cellPos).toBeGreaterThan(0);
      const from = cellPos + 2;
      const to = cellPos + 6;
      editor.view.dispatch(
        editor.state.tr.setSelection(
          TextSelection.create(editor.state.doc, from, to),
        ),
      );
      const serializer = createSmartClipboardTextSerializer(() => editor.state);
      const slice = editor.state.selection.content();
      const output = serializer(slice);
      expect(output).not.toContain('|');
      editor.destroy();
    });

    it('T10: Detector A — slice wraps a single codeBlock → serializer emits plain code', () => {
      const editor = makeEditor({
        type: 'doc',
        content: [
          {
            type: 'codeBlock',
            content: [{ type: 'text', text: 'let x = 1' }],
          },
        ],
      });
      // Drag-selection of the whole codeBlock: slice starts at the
      // codeBlock's opening and ends at its closing, openStart = openEnd = 0.
      const { pos, size } = findFirstNodePos(editor, 'codeBlock');
      const slice = editor.state.doc.slice(pos, pos + size);
      const serializer = createSmartClipboardTextSerializer(() => null);
      const output = serializer(slice);
      expect(output).toContain('let x = 1');
      expect(output).not.toContain('```');
      editor.destroy();
    });

    it('T11: cross-block mixed selection (paragraph + bulletList) → Markdown via legacy fallback', () => {
      const editor = makeEditor({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'intro text' }],
          },
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'alpha' }],
                  },
                ],
              },
              {
                type: 'listItem',
                content: [
                  {
                    type: 'paragraph',
                    content: [{ type: 'text', text: 'beta' }],
                  },
                ],
              },
            ],
          },
        ],
      });
      // Select from inside the paragraph to inside the list — the
      // shared ancestor is the doc root (not structural), so
      // Detector B does not fire, and the slice is not a single
      // block, so Detector A does not fire either. Legacy fallback
      // runs: the slice contains a bulletList, so Markdown wins.
      const from = 3;
      const to = editor.state.doc.content.size - 3;
      editor.view.dispatch(
        editor.state.tr.setSelection(
          TextSelection.create(editor.state.doc, from, to),
        ),
      );
      const serializer = createSmartClipboardTextSerializer(() => editor.state);
      const slice = editor.state.selection.content();
      const output = serializer(slice);
      expect(output).toMatch(/[-*]\s/);
      editor.destroy();
    });

    it('T12: no selection injected → legacy behavior (Detector A + whitelist fallback)', () => {
      const editor = makeEditor({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'emphasized',
                marks: [{ type: 'bold' }],
              },
            ],
          },
        ],
      });
      // Default arg means getEditorState always returns null — same
      // as calling createSmartClipboardTextSerializer() with no args.
      const serializer = createSmartClipboardTextSerializer();
      const output = serializer(wholeDocSlice(editor));
      expect(output).toBe('emphasized');
      expect(output).not.toContain('**');
      editor.destroy();
    });
  });
});
