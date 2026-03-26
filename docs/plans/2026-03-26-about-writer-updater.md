# About Writer Updater Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an in-app update check and one-click install flow to the existing About Writer panel using Tauri's official updater path and GitHub Releases as the release source.

**Architecture:** The About panel will call a small frontend updater service that wraps Tauri updater APIs and fetches GitHub release metadata for richer UI. Tauri configuration, permissions, and release workflow will be updated so the updater endpoint resolves to GitHub's stable latest-download asset path.

**Tech Stack:** React 19, TypeScript, Vitest, Tauri 2, Rust, GitHub Actions

---

### Task 1: Add failing updater behavior tests

**Files:**

- Create: `src/ui/components/About/AboutWriterPanel.update.test.tsx`
- Modify: `src/app/AppAboutBehavior.test.ts`

**Step 1: Write the failing test**

Add tests that assert:

- the About panel renders a `Check for Updates` action
- clicking it calls the updater service
- an available update renders version metadata and an `Update Now` action
- install progress is rendered
- failure state shows an `Open Release Page` fallback

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/ui/components/About/AboutWriterPanel.update.test.tsx src/app/AppAboutBehavior.test.ts`
Expected: FAIL because the update UI and service do not exist yet

**Step 3: Write minimal implementation later**

Do not write production code in this task.

**Step 4: Re-run after implementation**

Run the same command after Tasks 2 and 3.
Expected: PASS

### Task 2: Implement frontend updater flow

**Files:**

- Create: `src/ui/components/About/aboutUpdater.ts`
- Modify: `src/ui/components/About/AboutWriterPanel.tsx`
- Modify: `src/ui/components/About/index.ts`
- Modify: `src/shared/i18n/messages.ts`
- Modify: `src/app/App.css`

**Step 1: Write the failing test**

Reuse Task 1 tests as the red step for this implementation.

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/ui/components/About/AboutWriterPanel.update.test.tsx src/app/AppAboutBehavior.test.ts`
Expected: FAIL with missing updater UI behavior

**Step 3: Write minimal implementation**

Implement:

- updater service wrapper around Tauri updater calls
- GitHub release metadata helper
- About panel update state machine and inline progress UI
- localized update strings and fallback release-page action

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/ui/components/About/AboutWriterPanel.update.test.tsx src/app/AppAboutBehavior.test.ts`
Expected: PASS

### Task 3: Wire Tauri updater configuration

**Files:**

- Modify: `package.json`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/capabilities/default.json`

**Step 1: Write the failing test**

Add assertions that:

- updater dependencies are declared
- Rust registers the updater plugin
- capabilities include updater permissions
- `tauri.conf.json` contains an updater endpoint

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/app/AppAboutBehavior.test.ts`
Expected: FAIL because updater wiring is absent

**Step 3: Write minimal implementation**

Add official updater dependencies and config only, without unrelated restructuring.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/app/AppAboutBehavior.test.ts`
Expected: PASS

### Task 4: Update GitHub release workflow

**Files:**

- Modify: `.github/workflows/release.yml`
- Modify: `build/README.md`

**Step 1: Write the failing test**

Extend static behavior coverage to assert release workflow publishes updater artifacts.

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/app/AppAboutBehavior.test.ts`
Expected: FAIL because workflow lacks updater artifact configuration

**Step 3: Write minimal implementation**

Update the workflow to publish updater artifacts and document the required signing expectations in `build/README.md`.

**Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/app/AppAboutBehavior.test.ts`
Expected: PASS

### Task 5: Refine and simplify implementation

**Files:**

- Review files touched in Tasks 1-4

**Step 1: Refactor after green**

Simplify state transitions, extract obvious helpers, and remove duplication in update-state rendering without changing behavior.

**Step 2: Run focused verification**

Run: `pnpm vitest run src/ui/components/About/AboutWriterPanel.update.test.tsx src/app/AppAboutBehavior.test.ts`
Expected: PASS

### Task 6: Update capability documentation

**Files:**

- Modify: `docs/capability/window-chrome.md`
- Create or Modify: updater-related capability documentation if needed

**Step 1: Update docs after behavior is stable**

Document:

- About panel update entry
- updater dependency on GitHub release artifacts
- fallback release-page path
- verification checklist updates

**Step 2: Verify docs match implementation**

Re-read touched code and docs together.
Expected: capability text matches current truth only

### Task 7: Full verification

**Files:**

- None

**Step 1: Run the full verification set**

Run: `pnpm test`
Expected: PASS

Run: `pnpm lint`
Expected: PASS

Run: `pnpm build`
Expected: PASS

**Step 2: Report actual status**

Only claim completion after these commands finish cleanly.
