export type PasteHandler = (event: ClipboardEvent) => boolean | Promise<boolean>;

export const createHandleDOMEvents = (handlePaste: PasteHandler) => ({
  paste: (_view: unknown, event: ClipboardEvent): boolean => {
    // Tiptap DOM event hooks run only after view is mounted, avoiding direct view.dom access.
    void handlePaste(event);
    return false;
  },
});
