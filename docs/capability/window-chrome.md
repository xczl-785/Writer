# window-chrome

## Quick Read

- **id**: `window-chrome`
- **name**: Window Chrome
- **summary**: Manages custom macOS and Windows title bars, window controls, drag regions, and interactive control isolation.
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
- **last_verified**: 2026-03-21

---

## Capability Summary

This capability provides the cross-platform custom window title bar. `PlatformTitleBar` routes to `MacTitleBar` or `WindowsTitleBar` based on the runtime platform. On Windows, draggable title-bar space is declared with `data-tauri-drag-region`, while interactive controls are isolated with `data-no-drag` and pointer-event boundaries so that menu actions, sidebar toggle actions, and window control buttons are not misinterpreted as blank title-bar gestures. Minimize, maximize/restore, and close remain explicit button-driven Tauri window actions.

As of 2026-03-21, Windows title-bar blank-space gestures no longer mix manual `onDoubleClick` / `startDragging()` handlers with `data-tauri-drag-region`. Dragging and double-click maximize/restore for blank title-bar space now rely on the Tauri drag-region behavior only, preventing duplicate gesture handling on Windows.

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

## Impact Surface

| Area                  | What to check                                                                     | Evidence                                                                                          |
| --------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Platform routing      | Platform dispatch still works                                                     | `src/ui/chrome/PlatformTitleBar.tsx`                                                              |
| Windows title bar     | Drag-region declarations, maximize state sync, and button behavior remain correct | `src/ui/chrome/WindowsTitleBar.tsx`                                                               |
| Mac title bar         | Traffic-light controls and drag-region behavior remain intact                     | `src/ui/chrome/MacTitleBar.tsx`                                                                   |
| Windows menu bar      | `data-no-drag` and `data-menu-open` still behave correctly                        | `src/ui/chrome/WindowsMenuBar.tsx`                                                                |
| focus zen integration | Title-bar visibility changes do not break menu wake-up or button clicks           | `src/ui/layout/useFocusZenWakeup.ts`, `src/ui/chrome/WindowsTitleBar.tsx`                         |
| Test coverage         | Platform-title-bar and Windows-title-bar integration tests remain green           | `src/app/PlatformTitleBarIntegration.test.ts`, `src/ui/chrome/WindowsTitleBarIntegration.test.ts` |

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
| `useSidebarToggleBehavior` | Drives sidebar-toggle single/double click behavior           | `src/ui/chrome/WindowsTitleBar.tsx`, `src/ui/chrome/MacTitleBar.tsx` |

---

## Archive Pointer

- None. This is the first-version capability document.
