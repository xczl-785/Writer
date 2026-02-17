import { MarkdownManager } from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';

export type EditorJSON = Record<string, unknown>;

const manager = new MarkdownManager({
  extensions: [
    StarterKit,
    Image,
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableHeader,
    TableCell,
  ],
  markedOptions: {
    gfm: true,
  },
});

export const MarkdownService = {
  async parse(md: string): Promise<EditorJSON> {
    return manager.parse(md);
  },

  async serialize(doc: EditorJSON): Promise<string> {
    return manager.serialize(doc);
  },
};
