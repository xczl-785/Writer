/**
 * Editor extension list — single source of truth for the ProseMirror
 * schema that powers the Writer editor.
 *
 * This module exists so that the schema consistency test can import
 * the editor's extension set without pulling in the full React
 * component tree, and so that `MarkdownService`'s extension set can
 * be verified as a subset of this one (capability
 * `markdown-clipboard` CR-018).
 *
 * Extensions that depend on UI state (shortcut handlers, toolbar
 * runners, find/replace glue, outline, block boundary decoration)
 * stay in EditorImpl — they are NOT part of the schema and would
 * only add noise here. Only schema-contributing extensions and
 * per-activeFile customisations live in this module.
 */
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import BaseTableHeader from '@tiptap/extension-table-header';
import BaseTableCell from '@tiptap/extension-table-cell';
import type { Extensions } from '@tiptap/core';
import { ImageResolver } from '../../../services/images/ImageResolver';

export interface EditorExtensionOptions {
  /**
   * Currently active file path. Only used by the Image extension's
   * src resolver; passing `null` is valid and yields the same schema.
   */
  activeFile: string | null;
}

const configuredStarterKit = StarterKit.configure({
  heading: { levels: [1, 2, 3, 4, 5, 6] },
  link: {
    openOnClick: false,
    HTMLAttributes: {
      class: 'editor-link',
      target: null,
      rel: null,
    },
  },
});

const configuredTableHeader = BaseTableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      textAlign: {
        default: 'left',
        renderHTML: (attributes) =>
          attributes.textAlign
            ? { style: `text-align: ${attributes.textAlign}` }
            : {},
      },
      borderHidden: {
        default: false,
        renderHTML: (attributes) =>
          attributes.borderHidden ? { style: 'border-style: none' } : {},
      },
    };
  },
});

const configuredTableCell = BaseTableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      textAlign: {
        default: 'left',
        renderHTML: (attributes) =>
          attributes.textAlign
            ? { style: `text-align: ${attributes.textAlign}` }
            : {},
      },
      borderHidden: {
        default: false,
        renderHTML: (attributes) =>
          attributes.borderHidden ? { style: 'border-style: none' } : {},
      },
    };
  },
});

export function createEditorSchemaExtensions(
  options: EditorExtensionOptions,
): Extensions {
  const { activeFile } = options;
  const configuredImage = Image.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        src: {
          default: null,
          renderHTML: (attributes) => ({
            src: ImageResolver.resolve(attributes.src, activeFile),
          }),
        },
      };
    },
  });

  return [
    configuredStarterKit,
    Highlight,
    TaskList,
    TaskItem.configure({ nested: true }),
    Table.configure({ resizable: true, allowTableNodeSelection: false }),
    TableRow,
    configuredTableHeader,
    configuredTableCell,
    configuredImage,
  ];
}
