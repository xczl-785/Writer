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
import {
  containsStructuralNode,
  createSmartClipboardTextSerializer,
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

    it('routes a bullet list to Markdown with list prefixes', () => {
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
        content: [{ type: 'horizontalRule' }],
      });
      const output = serializer(wholeDocSlice(editor));
      expect(output).toMatch(/---|\*\*\*|___/);
      editor.destroy();
    });

    it('routes a table to Markdown with pipe syntax', () => {
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
});
