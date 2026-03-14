# Title Bar And Menu Bar Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor platform chrome and Zen-related UI control flow so sidebar toggle behavior, header visibility, and title bar state are shared, explicit, and testable.

**Architecture:** Extract shared title bar interaction logic into reusable hooks and move chrome-specific state shaping behind a small `AppChrome` boundary. Keep `viewModeSlice` as the source of truth for Zen state, but add explicit selectors/helpers so sidebar visibility, focus zen, and header visibility stop being coordinated ad hoc in `App.tsx`.

**Tech Stack:** React 19, Zustand, Vitest, jsdom, Tauri custom chrome

---

### Task 1: Add failing interaction tests for sidebar toggle behavior

**Files:**

- Create: `src/ui/chrome/sidebarToggleBehavior.test.ts`
- Modify: `src/ui/chrome/WindowsTitleBarIntegration.test.ts`

**Step 1: Write the failing test**

Cover:

- single click toggles sidebar after debounce when not in focus zen
- double click toggles focus zen and cancels pending single click
- single click exits focus zen before toggling sidebar

**Step 2: Run test to verify it fails**

Run: `npm test -- src/ui/chrome/sidebarToggleBehavior.test.ts`

Expected: FAIL because the shared behavior hook does not exist yet.

**Step 3: Write minimal implementation**

Create a shared hook for sidebar button click and double click handling.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/ui/chrome/sidebarToggleBehavior.test.ts src/ui/chrome/WindowsTitleBarIntegration.test.ts`

Expected: PASS

### Task 2: Add failing behavior tests for title bar/header visibility policy

**Files:**

- Create: `src/ui/chrome/headerVisibilityPolicy.test.ts`
- Modify: `src/app/PlatformTitleBarIntegration.test.ts`

**Step 1: Write the failing test**

Cover:

- focus zen hides title bar only when header is not awake
- normal zen or normal mode keeps title bar visible
- policy is reusable by editor header and platform title bar

**Step 2: Run test to verify it fails**

Run: `npm test -- src/ui/chrome/headerVisibilityPolicy.test.ts`

Expected: FAIL because the shared policy helper does not exist yet.

**Step 3: Write minimal implementation**

Create a shared helper/hook that computes header visibility from the chrome state.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/ui/chrome/headerVisibilityPolicy.test.ts src/app/PlatformTitleBarIntegration.test.ts`

Expected: PASS

### Task 3: Extract chrome state boundary from `App.tsx`

**Files:**

- Create: `src/app/AppChrome.tsx`
- Create: `src/ui/chrome/chromeState.ts`
- Modify: `src/app/App.tsx`
- Modify: `src/ui/chrome/PlatformTitleBar.tsx`

**Step 1: Write the failing test**

Extend existing integration coverage to assert `App` renders an `AppChrome` container or a shared chrome state boundary instead of directly threading all title bar props.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/app/PlatformTitleBarIntegration.test.ts`

Expected: FAIL because `App.tsx` still passes the chrome props directly.

**Step 3: Write minimal implementation**

Move title bar state/action composition into a dedicated container and keep `App.tsx` focused on page layout.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/app/PlatformTitleBarIntegration.test.ts`

Expected: PASS

### Task 4: Make Zen/sidebar/header coordination explicit

**Files:**

- Modify: `src/state/slices/viewModeSlice.ts`
- Modify: `src/app/App.tsx`
- Modify: `src/ui/chrome/WindowsTitleBar.tsx`
- Modify: `src/ui/chrome/MacTitleBar.tsx`
- Modify: `src/domains/editor/ui/components/EditorShell.tsx`

**Step 1: Write the failing test**

Add coverage for:

- focus zen entry hides sidebar and enables zen presentation
- exiting focus zen from sidebar button does not accidentally re-toggle sidebar
- shared header visibility policy is used on both editor header and platform title bar

**Step 2: Run test to verify it fails**

Run: `npm test -- src/ui/chrome/sidebarToggleBehavior.test.ts src/ui/chrome/headerVisibilityPolicy.test.ts`

Expected: FAIL until state composition is explicit.

**Step 3: Write minimal implementation**

Add explicit view-mode helpers/selectors and route chrome visibility decisions through them.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/ui/chrome/sidebarToggleBehavior.test.ts src/ui/chrome/headerVisibilityPolicy.test.ts src/app/PlatformTitleBarIntegration.test.ts`

Expected: PASS

### Task 5: Remove obsolete editor sidebar props and update verification

**Files:**

- Modify: `src/domains/editor/core/editorTypes.ts`
- Modify: `src/app/App.tsx`
- Modify: `src/ui/sidebar/SidebarResponsiveBehavior.test.ts`

**Step 1: Write the failing test**

Assert the editor prop types no longer expose `isSidebarVisible` and `onToggleSidebar`.

**Step 2: Run test to verify it fails**

Run: `npm test -- src/ui/sidebar/SidebarResponsiveBehavior.test.ts`

Expected: FAIL because the legacy props still exist.

**Step 3: Write minimal implementation**

Remove the legacy editor props and any now-unused plumbing.

**Step 4: Run test to verify it passes**

Run: `npm test -- src/ui/sidebar/SidebarResponsiveBehavior.test.ts`

Expected: PASS

### Task 6: Final verification

**Files:**

- No code changes required

**Step 1: Run targeted verification**

Run: `npm test -- src/ui/chrome/sidebarToggleBehavior.test.ts src/ui/chrome/headerVisibilityPolicy.test.ts src/ui/chrome/WindowsTitleBarIntegration.test.ts src/app/PlatformTitleBarIntegration.test.ts src/ui/sidebar/SidebarResponsiveBehavior.test.ts src/ui/chrome/WindowsMenuBarBehavior.test.ts`

Expected: PASS

**Step 2: Run lint if affected surface changed materially**

Run: `npm run lint`

Expected: PASS or a pre-existing failure list captured explicitly.
