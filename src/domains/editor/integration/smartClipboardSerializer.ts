/**
 * Smart clipboard text serializer.
 *
 * Picks between Markdown source and plain text for the `text/plain`
 * clipboard channel based on the actual content of the user's selection:
 *
 *  - If the selection contains any structural node (list, task list,
 *    code block, blockquote, horizontal rule, table, inline code) the
 *    Markdown source is emitted — the syntax carries information the
 *    user would lose otherwise.
 *  - Otherwise the selection is projected to plain text with all
 *    visual-only marks (bold, italic, link, highlight, ...) stripped.
 *
 * The whitelist is the authoritative source for capability
 * `markdown-clipboard` CR-013.
 */
import type { Node as ProseMirrorNode, Slice } from '@tiptap/pm/model';
import { markdownManager } from '../../../services/markdown/MarkdownService';

export const STRUCTURAL_NODE_TYPES: ReadonlySet<string> = new Set([
  // Block lists
  'bulletList',
  'orderedList',
  'taskList',
  'listItem',
  'taskItem',
  // Block code and quotes
  'codeBlock',
  'blockquote',
  'horizontalRule',
  // Tables
  'table',
  'tableRow',
  'tableCell',
  'tableHeader',
]);

export const STRUCTURAL_MARK_TYPES: ReadonlySet<string> = new Set([
  // Inline code is a mark in ProseMirror, not a node.
  'code',
]);

/**
 * Returns true when the slice contains any node or mark that would
 * lose information if projected to plain text.
 */
export function containsStructuralNode(slice: Slice): boolean {
  let found = false;
  slice.content.descendants((node: ProseMirrorNode) => {
    if (found) return false;
    if (STRUCTURAL_NODE_TYPES.has(node.type.name)) {
      found = true;
      return false;
    }
    if (node.isInline && node.marks.length > 0) {
      for (const mark of node.marks) {
        if (STRUCTURAL_MARK_TYPES.has(mark.type.name)) {
          found = true;
          return false;
        }
      }
    }
    return true;
  });
  return found;
}

/**
 * Projects a slice to plain text. Block nodes are joined with
 * `\n\n`; hardBreak nodes become `\n`. All inline marks are silently
 * dropped — any mark worth preserving is in the structural whitelist
 * and would have routed the selection to the Markdown path instead.
 */
export function serializeSliceAsPlainText(slice: Slice): string {
  const blocks: string[] = [];
  slice.content.forEach((node) => {
    blocks.push(flattenBlockToText(node));
  });
  return blocks.join('\n\n');
}

function flattenBlockToText(node: ProseMirrorNode): string {
  if (node.isTextblock) {
    let out = '';
    node.content.forEach((child) => {
      if (child.type.name === 'hardBreak') {
        out += '\n';
      } else if (child.isText) {
        out += child.text ?? '';
      } else {
        out += child.textContent;
      }
    });
    return out;
  }

  // Non-textblock container (shouldn't occur on the plain-text path
  // because the whitelist would have kicked in, but be defensive).
  const parts: string[] = [];
  node.content.forEach((child) => {
    parts.push(flattenBlockToText(child));
  });
  return parts.join('\n\n');
}

/**
 * Serializes a slice as Markdown source by wrapping its content as a
 * doc and delegating to the shared markdownManager.
 */
export function serializeSliceAsMarkdown(slice: Slice): string {
  const json = slice.content.toJSON();
  if (!json || (Array.isArray(json) && json.length === 0)) {
    return '';
  }
  return markdownManager.serialize({
    type: 'doc',
    content: Array.isArray(json) ? json : [json],
  });
}

/**
 * Factory for the ProseMirror `clipboardTextSerializer` prop: returns
 * the smart serializer that picks Markdown vs plain text based on
 * selection content.
 */
export function createSmartClipboardTextSerializer() {
  return (slice: Slice): string => {
    if (containsStructuralNode(slice)) {
      return serializeSliceAsMarkdown(slice);
    }
    return serializeSliceAsPlainText(slice);
  };
}
