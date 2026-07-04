import type { Extensions } from '@tiptap/core';
import {
  createEditorSchemaExtensions as createCoreEditorSchemaExtensions,
  type EditorExtensionOptions,
  type ResolveImageSrc,
} from '../../../core/editor';
import { ImageResolver } from '../../../services/images/ImageResolver';

export type { EditorExtensionOptions, ResolveImageSrc };

export function createEditorSchemaExtensions(
  options: EditorExtensionOptions,
): Extensions {
  return createCoreEditorSchemaExtensions({
    ...options,
    resolveImageSrc: (src, activeFile) =>
      ImageResolver.resolve(src, activeFile),
  });
}
