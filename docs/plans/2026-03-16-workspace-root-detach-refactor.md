# Workspace Root Detach Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor workspace root removal into a shared internal transaction so menu removal, sidebar removal, and external deletion stay behaviorally aligned without changing user-visible behavior.

**Architecture:** Keep the public entrypoints stable and extract a private helper inside `workspaceActions.ts` that owns all state transitions for detaching a root folder. Parameterize only the persistence/dirty semantics that differ by caller so the refactor preserves existing behavior while eliminating duplicated state handling.

**Tech Stack:** TypeScript, Zustand, Vitest, Tauri watcher bridge

---

### Task 1: Lock in current and intended removal side effects

**Files:**
- Modify: `src/domains/workspace/services/workspaceActions.fileWatcher.test.ts`

**Step 1: Write the failing test**

Add assertions showing that external root deletion:
- clears expanded state for the removed root
- persists workspace state after detaching the root
- keeps existing watcher update behavior

Add assertions showing explicit `removeFolderFromWorkspace()` still:
- clears expanded state
- persists workspace state
- marks workspace dirty

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/domains/workspace/services/workspaceActions.fileWatcher.test.ts`

Expected: FAIL because the external deletion path currently does not clear expanded state or save workspace state through the same transaction.

**Step 3: Commit**

Do not commit yet.

### Task 2: Extract the shared detach transaction

**Files:**
- Modify: `src/domains/workspace/services/workspaceActions.ts`

**Step 1: Write minimal implementation**

Extract a private helper for detaching a workspace folder that:
- closes/removes files under the root
- removes the root from workspace and file-tree state
- clears expanded and selected state
- updates or stops watcher paths
- optionally marks dirty
- optionally persists workspace state

Route both:
- `removeFolderFromWorkspace()`
- watcher root deletion branch in `handleFileChange()`

through the helper.

**Step 2: Run focused tests to verify they pass**

Run: `npx vitest run src/domains/workspace/services/workspaceActions.fileWatcher.test.ts`

Expected: PASS

### Task 3: Verify related regressions

**Files:**
- No additional production file changes expected

**Step 1: Run related tests**

Run: `npx vitest run src/domains/workspace/services/workspaceActions.fileWatcher.test.ts src/domains/workspace/services/WorkspaceLoadWorkspaceFileBehavior.test.ts src/domains/workspace/services/WorkspaceManager.test.ts src/app/BuildWarningsRegression.test.ts`

Expected: PASS

**Step 2: Commit**

Do not commit unless explicitly requested.
