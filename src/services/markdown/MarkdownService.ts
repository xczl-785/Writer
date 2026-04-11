import { MarkdownManager } from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';

export type EditorJSON = Record<string, unknown>;

/**
 * Schema-contributing extensions consumed by the Markdown manager.
 *
 * Every mark type and node type produced by `markdownManager.parse`
 * is ultimately resolved against the editor's ProseMirror schema via
 * `schema.nodeFromJSON(...)`. If an extension listed here has no
 * counterpart in the editor's extension list, parsed JSON will
 * contain types unknown to the editor schema and every paste / file
 * load that hits them will throw. Capability `markdown-clipboard`
 * CR-018 locks this invariant; see
 * `src/domains/editor/__tests__/schemaConsistency.test.ts`.
 */
export const markdownExtensions = [
  StarterKit,
  Highlight,
  TaskList,
  TaskItem.configure({ nested: true }),
  Image,
  Table.configure({
    resizable: true,
  }),
  TableRow,
  TableHeader,
  TableCell,
];

export const markdownManager = new MarkdownManager({
  extensions: markdownExtensions,
  markedOptions: {
    gfm: true,
  },
});

export const MarkdownService = {
  async parse(md: string): Promise<EditorJSON> {
    return markdownManager.parse(md);
  },

  async serialize(doc: EditorJSON): Promise<string> {
    return markdownManager.serialize(doc);
  },
};
