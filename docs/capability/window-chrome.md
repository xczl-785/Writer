# window-chrome

## Quick Read

- **id**: `window-chrome`
- **name**: Window Chrome
- **summary**: Manages custom macOS and Windows title bars, window controls, drag regions, interactive control isolation, and Windows title-bar menu entry interactions such as Help > About Writer.
- **scope**: Includes platform title bar routing, Windows/macOS title bar structure, `data-tauri-drag-region`, window control buttons, and isolation for menu/sidebar controls; excludes workspace business logic and editor content interactions.
- **entry_points**:
  - `PlatformTitleBar`
  - `WindowsTitleBar`
  - `MacTitleBar`
- **shared_with**:
  - `focus-zen`
- **check_on_change**:
  - Windows blank title-bar area still drags the window and double-click follows native maximize/restore behavior.
  - Menu bar, sidebar toggle, and window control buttons are not swallowed by drag-region behavior.
  - focus zen visibility changes do not break the above interactions.
  - Windows Help > About Writer still opens from the title-bar menu and the dialog uses Writer's own icon (`/icon.svg`).
  - The About dialog environment line resolves from the runtime desktop platform (`Windows`, `macOS`, `Linux`) instead of hard-coded Windows copy.
  - The About dialog update card still exposes manual update checks without breaking title-bar or menu interactions.
- **last_verified**: 2026-03-21

---

## Capability Summary

This capability provides the cross-platform custom window title bar. `PlatformTitleBar` routes to `MacTitleBar` or `WindowsTitleBar` based on the runtime platform. On Windows, draggable title-bar space is declared with `data-tauri-drag-region`, while interactive controls are isolated with `data-no-drag` and pointer-event boundaries so that menu actions, sidebar toggle actions, and window control buttons are not misinterpreted as blank title-bar gestures. Minimize, maximize/restore, and close remain explicit button-driven Tauri window actions.

As of 2026-03-21, Windows title-bar blank-space gestures no longer mix manual `onDoubleClick` / `startDragging()` handlers with `data-tauri-drag-region`. Dragging and double-click maximize/restore for blank title-bar space now rely on the Tauri drag-region behavior only, preventing duplicate gesture handling on Windows.

The Windows title-bar Help menu now exposes **About Writer** as an enabled entry. Selecting it opens an in-app modal panel mounted from `App.tsx`, while the remaining Help items stay disabled placeholders until their dedicated capability work lands. The About panel must use Writer's own `/icon.svg` asset rather than a placeholder graphic, and its runtime environment line must resolve from the current desktop platform so the same panel copy remains correct on Windows, macOS, and future Linux builds. As of 2026-03-26, the same About surface also owns manual update checks, so menu-entry behavior now implicitly depends on the update CTA remaining reachable after the panel opens.

---

## Entries

| Entry              | Trigger                              | Evidence                                   | Notes                                          |
| ------------------ | ------------------------------------ | ------------------------------------------ | ---------------------------------------------- |
| `PlatformTitleBar` | App mounts title bar                 | `src/ui/chrome/PlatformTitleBar.tsx:10-17` | Routes by platform                             |
| `WindowsTitleBar`  | Windows / non-macOS title bar render | `src/ui/chrome/WindowsTitleBar.tsx:50-215` | Uses `data-tauri-drag-region` + `data-no-drag` |
| `MacTitleBar`      | macOS title bar render               | `src/ui/chrome/MacTitleBar.tsx:52-104`     | Uses traffic-light controls                    |

---

## Current Rules

### CR-001: Platform title-bar rendering must go through the shared router

The app must use `PlatformTitleBar` to choose the platform-specific title bar implementation. App-level code must not bypass the router and bind a platform-specific title bar directly.

**Evidence**: `src/ui/chrome/PlatformTitleBar.tsx:10-17`

---

### CR-002: Windows blank title-bar gestures rely on `data-tauri-drag-region` only

Dragging and double-click maximize/restore for Windows blank title-bar space must rely on `data-tauri-drag-region` only. Manual `onDoubleClick` handlers and `window.startDragging()` entry points must not be layered on top.

**Evidence**: `src/ui/chrome/WindowsTitleBar.tsx:129-175`

---

### CR-003: Windows interactive controls must explicitly opt out of drag behavior

The Windows sidebar toggle, menu bar, and minimize/maximize/close buttons must be isolated from drag-region behavior with `data-no-drag` or dedicated pointer-event boundaries so user interaction is not swallowed by blank title-bar gestures.

**Evidence**: `src/ui/chrome/WindowsTitleBar.tsx:153-208`, `src/ui/chrome/WindowsMenuBar.tsx:596-597`

---

### CR-004: Window control buttons remain explicit Tauri window actions

Minimize, maximize/restore, and close must remain explicit button-triggered calls to `getCurrentWindow().minimize()`, `toggleMaximize()`, and `close()`. They must not depend on implicit drag-region behavior.

**Evidence**: `src/ui/chrome/WindowsTitleBar.tsx:26-47,177-208`, `src/ui/chrome/MacTitleBar.tsx:10-31,76-82`

---

### CR-005: Visibility toggles must not remove title-bar interaction semantics

In focus zen or similar modes, the title bar may hide via `isVisible`-driven opacity/pointer-events behavior, but the drag-region and interactive-control isolation semantics must remain intact.

**Evidence**: `src/ui/chrome/WindowsTitleBar.tsx:118-123`, `src/ui/chrome/MacTitleBar.tsx:63-67`

---

### CR-006: About dialog platform copy must be resolved at runtime

The About Writer dialog must not hard-code Windows-only platform copy. It must resolve the current desktop platform at runtime and present a platform-specific environment line that stays correct for Windows, macOS, and Linux distributions.

**Evidence**: `src/ui/components/About/AboutWriterPanel.tsx`

---

## Impact Surface

| Area                  | What to check                                                                                          | Evidence                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Platform routing      | Platform dispatch still works                                                                          | `src/ui/chrome/PlatformTitleBar.tsx`                                                                         |
| Windows title bar     | Drag-region declarations, maximize state sync, and button behavior remain correct                      | `src/ui/chrome/WindowsTitleBar.tsx`                                                                          |
| Mac title bar         | Traffic-light controls and drag-region behavior remain intact                                          | `src/ui/chrome/MacTitleBar.tsx`                                                                              |
| Windows menu bar      | `data-no-drag`, `data-menu-open`, and Help > About Writer still behave correctly                       | `src/ui/chrome/WindowsMenuBar.tsx`, `src/ui/chrome/menuSchema.ts`, `src-tauri/src/menu.rs`                   |
| About dialog          | Icon presentation uses `/icon.svg`, runtime platform copy remains correct, and updater CTA still works | `src/ui/components/About/AboutWriterPanel.tsx`, `src/app/App.css`, `src/ui/components/About/aboutUpdater.ts` |
| focus zen integration | Title-bar visibility changes do not break menu wake-up or button clicks                                | `src/ui/layout/useFocusZenWakeup.ts`, `src/ui/chrome/WindowsTitleBar.tsx`                                    |
| Test coverage         | Platform-title-bar and Windows-title-bar integration tests remain green                                | `src/app/PlatformTitleBarIntegration.test.ts`, `src/ui/chrome/WindowsTitleBarIntegration.test.ts`            |

---

## Shared Rules Dependency

| Shared Rule | Dependency                                                                     | Lifted |
| ----------- | ------------------------------------------------------------------------------ | ------ |
| focus-zen   | Uses title-bar visibility plus `data-menu-open` to keep Windows menus operable | no     |

---

## Uncertainties

- If future Windows title-bar work adds search fields, tabs, or other new controls, verify whether they need `data-no-drag` before release.

---

## Known Consumers

| Consumer                   | Usage                                                        | Evidence                                                             |
| -------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------- |
| `AppChrome`                | Mounts the platform title bar                                | `src/app/AppChrome.tsx`                                              |
| `PlatformTitleBar`         | Chooses the concrete title-bar implementation                | `src/ui/chrome/PlatformTitleBar.tsx`                                 |
| `WindowsMenuBar`           | Lives inside the Windows title bar as an interactive control | `src/ui/chrome/WindowsTitleBar.tsx`                                  |
| `AboutWriterPanel`         | Opens from the Windows Help menu inside the custom title bar | `src/app/App.tsx`, `src/ui/components/About/AboutWriterPanel.tsx`    |
| `useSidebarToggleBehavior` | Drives sidebar-toggle single/double click behavior           | `src/ui/chrome/WindowsTitleBar.tsx`, `src/ui/chrome/MacTitleBar.tsx` |

---

## Archive Pointer

- None. This is the first-version capability document.
