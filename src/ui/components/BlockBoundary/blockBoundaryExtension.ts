import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { ResolvedPos } from '@tiptap/pm/model';

const BLOCK_BOUNDARY_KEY = new PluginKey('blockBoundary');

type BlockType = 'codeBlock' | 'blockquote' | 'bulletList' | 'orderedList';

interface BlockBoundaryConfig {
  showCodeBlock?: boolean;
  showBlockquote?: boolean;
  showList?: boolean;
}

function getBlockType(nodeType: string): BlockType | null {
  switch (nodeType) {
    case 'codeBlock':
      return 'codeBlock';
    case 'blockquote':
      return 'blockquote';
    case 'bulletList':
      return 'bulletList';
    case 'orderedList':
      return 'orderedList';
    default:
      return null;
  }
}

function getBlockBoundaryClass(blockType: BlockType): string {
  switch (blockType) {
    case 'codeBlock':
      return 'block-boundary-code';
    case 'blockquote':
      return 'block-boundary-quote';
    case 'bulletList':
    case 'orderedList':
      return 'block-boundary-list';
    default:
      return '';
  }
}

function findDeepestBlockAt(
  $pos: ResolvedPos,
): { depth: number; blockType: BlockType } | null {
  for (let depth = $pos.depth; depth > 0; depth -= 1) {
    const node = $pos.node(depth);
    const blockType = getBlockType(node.type.name);
    if (blockType) {
      return { depth, blockType };
    }
  }
  return null;
}

export const BlockBoundaryExtension = Extension.create<BlockBoundaryConfig>({
  name: 'blockBoundary',

  addOptions() {
    return {
      showCodeBlock: true,
      showBlockquote: true,
      showList: false,
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;

    return [
      new Plugin({
        key: BLOCK_BOUNDARY_KEY,
        props: {
          decorations(state) {
            const { selection } = state;
            if (!selection.empty) {
              return DecorationSet.empty;
            }

            const blockInfo = findDeepestBlockAt(selection.$from);
            if (!blockInfo) {
              return DecorationSet.empty;
            }

            const { depth, blockType } = blockInfo;
            if (blockType === 'codeBlock' && !options.showCodeBlock) {
              return DecorationSet.empty;
            }
            if (blockType === 'blockquote' && !options.showBlockquote) {
              return DecorationSet.empty;
            }
            if (
              (blockType === 'bulletList' || blockType === 'orderedList') &&
              !options.showList
            ) {
              return DecorationSet.empty;
            }

            const from = selection.$from.before(depth);
            const to = selection.$from.after(depth);
            const cssClass = getBlockBoundaryClass(blockType);

            return DecorationSet.create(state.doc, [
              Decoration.node(from, to, {
                class: cssClass,
              }),
            ]);
          },
        },
      }),
    ];
  },
});
