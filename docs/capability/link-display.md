# link-display

## Quick Read

- **id**: `link-display`
- **name**: Link Display & Interaction
- **summary**: Visual styling, hover tooltip, Ctrl+Click navigation, and inline editing for links in the editor.
- **scope**: Includes link static styling, Ctrl/Cmd modifier hover activation, URL tooltip on hover, BubbleMenu link mode (open/edit/unlink), and Ctrl+Click open via Tauri opener. Excludes link detection/parsing (handled by Tiptap Link extension) and menu bar link command (handled by `applyLinkAction`).
- **entry_points**:
  - Mouse hover on link → tooltip with URL
  - Ctrl/Cmd hold → links become visually clickable
  - Ctrl/Cmd + Click → open link via OS default handler
  - Cursor inside link mark → BubbleMenu link mode (open / edit / unlink)
  - BubbleMenu format mode → Link button for creating links on selection
- **shared_with**: none
- **check_on_change**:
  - L0 static link color and border-bottom still visible
  - L1 tooltip appears on hover with correct URL, disappears on mouse leave/scroll
  - L2 Ctrl hover activates underline + pointer cursor, cleans up on key release/blur
  - L3 BubbleMenu link mode appears when cursor is inside link mark
  - L3 inline URL edit commits on Enter, cancels on Escape
  - Ctrl+Click still opens all URL schemes (http, https, zotero, obsidian, file)

---

## Capability Summary

The link-display capability provides a four-layer progressive interaction model for links in the editor:

1. **L0 Static** — Links are visually distinguished with `--color-action` blue color and a subtle bottom border.
2. **L1 Tooltip** — On mouse hover (400ms delay), a tooltip shows the destination URL below the link.
3. **L2 Modifier Activation** — When Ctrl/Cmd is held, links show a solid underline and pointer cursor, signaling clickability.
4. **L3 BubbleMenu Link Mode** — When the cursor is inside a link mark (collapsed selection), the BubbleMenu switches to link mode showing the URL with open/edit/unlink actions. The edit action provides an inline input replacing the previous `window.prompt()`.

The interaction orchestration is split across:
- `Editor.css` — All link-related CSS (static, hover, Ctrl modifier, tooltip, BubbleMenu link mode)
- `EditorImpl.tsx` — Link extension configuration (`editor-link` class, `openOnClick: false`), Ctrl/Cmd key listener for `.link-mod-active` class
- `LinkTooltip.tsx` — Hover tooltip component and `useLinkTooltip` hook
- `BubbleMenu.tsx` — Format mode and link mode with inline URL editing
- `linkClickHandler.ts` — Ctrl+Click → Tauri opener (unchanged)

---

## Current Rules

### CR-001: Link static styling

Links rendered by the Tiptap Link extension receive the `editor-link` CSS class via `StarterKit.configure({ link: { HTMLAttributes: { class: 'editor-link' } } })`. This class applies `color: var(--color-action)` and a subtle `border-bottom`.

**Evidence**: `src/domains/editor/core/EditorImpl.tsx` (StarterKit.configure), `src/domains/editor/core/Editor.css` (`.ProseMirror .editor-link`)

---

### CR-002: Ctrl/Cmd modifier activation

A keydown/keyup listener on the window toggles `.link-mod-active` class on `editor.view.dom`. The class is also removed on window blur to prevent Ctrl stickiness.

CSS: `.ProseMirror.link-mod-active .editor-link` shows solid underline + `cursor: pointer`.

**Evidence**: `src/domains/editor/core/EditorImpl.tsx` (useEffect for Ctrl/Cmd), `src/domains/editor/core/Editor.css`

---

### CR-003: Tooltip show/hide timing

The tooltip appears after 400ms hover delay and disappears after 150ms leave delay. It is immediately hidden on scroll. Moving between links resets the show timer.

**Evidence**: `src/domains/editor/ui/menus/LinkTooltip.tsx` (`SHOW_DELAY_MS`, `HIDE_DELAY_MS`)

---

### CR-004: BubbleMenu mode selection

The BubbleMenu has two modes:
- **Format mode**: shown when text is selected (non-empty selection + editor focused)
- **Link mode**: shown when cursor is collapsed inside a link mark (`editor.isActive('link')`)

These are mutually exclusive. Selection takes precedence (if you select text that includes a link, format mode is shown, not link mode).

**Evidence**: `src/domains/editor/ui/menus/BubbleMenu.tsx` (`useBubbleMenu` hook)

---

### CR-005: Inline URL editing

In link mode, clicking the edit button (✎) shows an inline input pre-filled with the current URL. Enter commits, Escape cancels. Empty input removes the link. Non-protocol URLs are auto-prefixed with `https://`.

**Evidence**: `src/domains/editor/ui/menus/BubbleMenu.tsx` (`LinkModeContent`)

---

### CR-006: Ctrl+Click open via Tauri opener

Ctrl+Click (or Cmd+Click on macOS) on a link opens the URL via `@tauri-apps/plugin-opener`, supporting all URL schemes registered with the OS.

**Evidence**: `src/domains/editor/handlers/linkClickHandler.ts`

---

## Impact Surface

| Area | What to check | Evidence |
|------|---------------|----------|
| Link extension config | `openOnClick: false` and `class: 'editor-link'` still set | `src/domains/editor/core/EditorImpl.tsx` |
| Static styling | Blue color + subtle border on `.editor-link` | `src/domains/editor/core/Editor.css` |
| Ctrl modifier | `.link-mod-active` toggled correctly, cleaned on blur | `src/domains/editor/core/EditorImpl.tsx` |
| Tooltip | Appears on hover, hides on leave/scroll, correct URL shown | `src/domains/editor/ui/menus/LinkTooltip.tsx` |
| BubbleMenu format mode | 6 buttons still work (Bold, Italic, Strike, Code, Link, Highlight) | `src/domains/editor/ui/menus/BubbleMenu.tsx` |
| BubbleMenu link mode | Open/edit/unlink buttons work, inline input commits/cancels | `src/domains/editor/ui/menus/BubbleMenu.tsx` |
| Ctrl+Click | All URL schemes open correctly | `src/domains/editor/handlers/linkClickHandler.ts` |
| Menu bar link | `applyLinkAction` still works for menu bar link command | `src/domains/editor/hooks/linkActions.ts`, `src/domains/editor/handlers/menuCommandHandler.ts` |
| i18n | Link-related keys exist for zh-CN and en-US | `src/shared/i18n/messages.ts` |
| Tests | `EditorLinkBehavior.test.ts`, `EditorBubbleMenu.test.ts` | `src/domains/editor/core/` |

---

## Shared Rules Dependency

| Shared Rule | Dependency | Lifted |
|-------------|-----------|--------|
| none | No shared rules identified | no |

---

## Uncertainties

- Tooltip positioning may need viewport clamping for links near the bottom edge of the editor.
- BubbleMenu link mode z-index interaction with LinkTooltip (tooltip z-index 35 < BubbleMenu z-index 40, so BubbleMenu always wins).

---

## Archive Pointer

- None. This is a first-version capability document.
