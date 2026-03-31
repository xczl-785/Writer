import { openUrl } from '@tauri-apps/plugin-opener';

/**
 * Intercept link clicks in the editor and open URLs via Tauri opener,
 * which delegates to the OS default handler. This enables custom URL
 * schemes (zotero://, obsidian://, file:/// etc.) to work in the desktop app.
 *
 * Only activates on Ctrl+Click (Windows/Linux) or Cmd+Click (macOS),
 * matching standard editor conventions for "follow link".
 */
export function handleEditorLinkClick(
  _view: unknown,
  event: MouseEvent,
): boolean {
  // Only intercept Ctrl+Click / Cmd+Click
  if (!event.ctrlKey && !event.metaKey) return false;

  const target = (event.target as HTMLElement)?.closest?.('a');
  if (!target) return false;

  const href = target.getAttribute('href');
  if (!href) return false;

  event.preventDefault();
  event.stopPropagation();

  void openUrl(href).catch((err) => {
    console.warn('[link] Failed to open URL:', href, err);
  });

  return true;
}
