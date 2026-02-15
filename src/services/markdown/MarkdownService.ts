import { MarkdownManager } from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';

export type EditorJSON = Record<string, unknown>;

const manager = new MarkdownManager({
  extensions: [StarterKit, Image],
});

export const MarkdownService = {
  async parse(md: string): Promise<EditorJSON> {
    return manager.parse(md);
  },

  async serialize(doc: EditorJSON): Promise<string> {
    return manager.serialize(doc);
  },
};
