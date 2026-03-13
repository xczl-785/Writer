import type { Editor } from '@tiptap/react';

export type ApplyLinkActionResult = 'applied' | 'cancelled' | 'unavailable';

const normalizeLinkInput = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^[a-z]+:\/\//i.test(trimmed) || trimmed.startsWith('mailto:')) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

export function applyLinkAction(editor: Editor): ApplyLinkActionResult {
  const currentHref = String(editor.getAttributes('link').href ?? '');
  const nextHref = window.prompt('Enter URL:', currentHref);

  if (nextHref === null) {
    return 'cancelled';
  }

  const normalizedHref = normalizeLinkInput(nextHref);
  const chain = editor.chain().focus().extendMarkRange('link');

  if (!normalizedHref) {
    return editor.isActive('link') && chain.unsetLink().run()
      ? 'applied'
      : 'unavailable';
  }

  return chain.setLink({ href: normalizedHref }).run()
    ? 'applied'
    : 'unavailable';
}
