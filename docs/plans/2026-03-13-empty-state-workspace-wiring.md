# Empty State Workspace Wiring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Render the V6 empty workspace prototype in the main app when no active file is open instead of falling back to the legacy `No file open` editor placeholder.

**Architecture:** Keep the editor component focused on editor runtime concerns and move empty-workspace rendering to the app shell. `App.tsx` will decide whether to render `EmptyStateWorkspace` or `Editor` based on workspace state, while the existing `EditorImpl` empty fallback remains only as a defensive guard.

**Tech Stack:** React 19, Zustand, Vitest, Tauri, Tailwind utility classes already imported through `src/index.css`

---

### Task 1: Lock expected app-shell behavior with a failing test

**Files:**
- Create: `src/app/AppEmptyStateWorkspaceBehavior.test.ts`
- Modify: `src/app/App.tsx`
- Test: `src/app/AppEmptyStateWorkspaceBehavior.test.ts`

**Step 1: Write the failing test**

Add a source-level behavior test that verifies `App.tsx` imports `EmptyStateWorkspace`, renders it in the main area, and no longer relies on the legacy `No file open` fallback for the empty workspace app shell.

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/app/AppEmptyStateWorkspaceBehavior.test.ts`
Expected: FAIL because `App.tsx` does not yet reference `EmptyStateWorkspace`.

**Step 3: Write minimal implementation**

Update `App.tsx` to:
- import `EmptyStateWorkspace`
- read the current workspace state needed for empty detection
- render `EmptyStateWorkspace` when there is no `activeFile`
- wire callbacks to existing workspace open/recent entry points

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/app/AppEmptyStateWorkspaceBehavior.test.ts`
Expected: PASS

### Task 2: Verify integration still builds

**Files:**
- Modify: `src/app/App.tsx`
- Verify: `src/ui/workspace/EmptyStateWorkspace.tsx`

**Step 1: Run focused app tests**

Run: `pnpm vitest run src/app/AppEmptyStateWorkspaceBehavior.test.ts src/app/AppRenderSafety.test.ts src/app/AppSettingsBehavior.test.ts`
Expected: PASS

**Step 2: Run production build**

Run: `pnpm build`
Expected: PASS
