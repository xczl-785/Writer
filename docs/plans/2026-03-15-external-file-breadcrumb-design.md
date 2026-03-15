# External File Breadcrumb Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make breadcrumb rendering choose workspace-relative paths for workspace files and absolute paths for files opened outside the workspace.

**Architecture:** Centralize active-file path presentation in the breadcrumb domain utility instead of letting `EditorImpl` infer a root from `folders[0]`. The breadcrumb utility will resolve the matching workspace root, build the proper breadcrumb model, and leave rendering/truncation to the UI.

**Tech Stack:** React, TypeScript, Vitest, Zustand

---

### Task 1: Add failing breadcrumb behavior tests

**Files:**
- Modify: `E:\Project\Writer\src\ui\components\Breadcrumb\useBreadcrumb.test.ts`

**Step 1: Write failing tests**
- Add one test for a file under the second workspace root.
- Add one test for a file outside all workspace roots.

**Step 2: Run test to verify it fails**
- Run: `npm test -- src/ui/components/Breadcrumb/useBreadcrumb.test.ts`
- Expected: FAIL because the new API/behavior does not exist yet.

### Task 2: Implement breadcrumb presentation model

**Files:**
- Modify: `E:\Project\Writer\src\ui\components\Breadcrumb\useBreadcrumb.ts`

**Step 1: Add root-resolution helper**
- Find the workspace root that contains the active file.

**Step 2: Add absolute/workspace breadcrumb builders**
- Workspace file => workspace-relative breadcrumb.
- External file => absolute-path breadcrumb.

**Step 3: Add a single entry point**
- `buildActiveFileBreadcrumb(...)` returns the correct breadcrumb items.

**Step 4: Run tests**
- Run: `npm test -- src/ui/components/Breadcrumb/useBreadcrumb.test.ts`
- Expected: PASS.

### Task 3: Switch editor to the new breadcrumb API

**Files:**
- Modify: `E:\Project\Writer\src\domains\editor\core\EditorImpl.tsx`

**Step 1: Replace `folders[0]?.path` assumption**
- Pass the workspace folders to the new breadcrumb builder.

**Step 2: Run focused verification**
- Run: `npm test -- src/ui/components/Breadcrumb/useBreadcrumb.test.ts src/app/AppFolderDropBehavior.test.ts`
- Expected: PASS.

### Task 4: Final verification

**Files:**
- No additional file changes expected

**Step 1: Run final targeted tests**
- Run: `npm test -- src/ui/components/Breadcrumb/useBreadcrumb.test.ts src/domains/workspace/services/WorkspaceLoadWorkspaceFileBehavior.test.ts`
- Expected: PASS.
