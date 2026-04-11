/**
 * Smart clipboard text serializer.
 *
 * Picks between Markdown source and plain text for the `text/plain`
 * clipboard channel based on whether the user's selection crosses
 * a structural block boundary:
 *
 *  - **Detector A** — the slice wraps exactly one structural block
 *    (e.g. a drag-selection that happened to include the whole code
 *    block): emit the plain-text projection of that block.
 *  - **Detector B** — the selection endpoints share a structural
 *    ancestor (e.g. Ctrl+A inside a codeBlock, or a drag inside a
 *    single blockquote / list item / table cell): emit the
 *    plain-text projection.
 *  - **Legacy fallback** — the slice contains a structural node
 *    reachable via `descendants` but neither detector fired: the
 *    selection genuinely crosses block boundaries, so the structural
 *    syntax is needed. Emit Markdown source.
 *  - Otherwise: plain text.
 *
 * The whitelist is the authoritative source for capability
 * `markdown-clipboard` CR-013; the "wholly inside a structural
 * block" exception is documented in the same CR.
 */
import type { Node as ProseMirrorNode, Slice } from '@tiptap/pm/model';
import type { EditorState, Selection } from '@tiptap/pm/state';
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
 * Detector A: the slice is exactly one fully-closed structural
 * block. A drag-selection that happens to include the whole block
 * (boundaries included) produces such a slice. The block's syntax
 * carries no information beyond its plain-text projection because
 * the user clearly knows they are inside that block.
 */
export function isSliceJustOneStructuralBlock(slice: Slice): boolean {
  if (slice.openStart !== 0 || slice.openEnd !== 0) return false;
  if (slice.content.childCount !== 1) return false;
  const child = slice.content.firstChild;
  if (!child) return false;
  return STRUCTURAL_NODE_TYPES.has(child.type.name);
}

/**
 * Detector B: the selection endpoints share a structural ancestor.
 * Walks the shared ancestor chain from `sharedDepth` down to (but
 * not including) the doc root, returning true on the first node
 * whose type is in the structural whitelist. When this fires, the
 * user's selection is entirely contained within one structural
 * block (codeBlock, blockquote, listItem, tableCell, ...) and the
 * block's structural syntax is redundant with the text content.
 *
 * Note: the shared ancestor chain deliberately walks ALL depths
 * from `sharedDepth` down to 1, not just the direct parent. This
 * means a selection that spans two paragraphs inside the same
 * blockquote still counts as "wholly inside one blockquote". The
 * semantics of "cross-sibling-listItem" are flagged as a decision
 * point in FIX-CODE-BLOCK-COPY.md §7 — the default implementation
 * here picks Option X (sharedDepth simple form).
 */
export function isSelectionWhollyInsideStructuralBlock(
  selection: Selection,
): boolean {
  const { $from, $to } = selection;
  const sharedDepth = $from.sharedDepth($to.pos);
  for (let d = sharedDepth; d > 0; d--) {
    const nodeTypeName = $from.node(d).type.name;
    if (STRUCTURAL_NODE_TYPES.has(nodeTypeName)) return true;
  }
  return false;
}

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
 * Factory for the ProseMirror `clipboardTextSerializer` prop.
 *
 * Accepts an optional `getEditorState` closure that the returned
 * serializer dereferences at copy time to read the current
 * selection. ProseMirror's `clipboardTextSerializer` hook does not
 * receive state/view, so the closure is how Detector B gets access
 * to the selection shape.
 *
 * Passing no argument keeps the legacy (slice-only) behavior for
 * backward compatibility and unit tests that do not need Detector B.
 */
export function createSmartClipboardTextSerializer(
  getEditorState: () => EditorState | null = () => null,
): (slice: Slice) => string {
  return (slice: Slice): string => {
    const state = getEditorState();
    if (state && isSelectionWhollyInsideStructuralBlock(state.selection)) {
      return serializeSliceAsPlainText(slice);
    }
    if (isSliceJustOneStructuralBlock(slice)) {
      return serializeSliceAsPlainText(slice);
    }
    if (containsStructuralNode(slice)) {
      return serializeSliceAsMarkdown(slice);
    }
    return serializeSliceAsPlainText(slice);
  };
}
