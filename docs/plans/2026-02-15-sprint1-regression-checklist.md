# Sprint 1 Regression Script and Checklist Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a comprehensive manual regression checklist for Sprint 1 features to ensure quality and consistency.

**Architecture:** Documentation-based checklist following `RELEASE_EVIDENCE_STANDARD.md`.

**Tech Stack:** Markdown.

---

### Task 1: Create QA_CHECKLIST_V1.md

**Files:**

- Create: `docs/current/QA_CHECKLIST_V1.md`

**Step 1: Define the structure and header**
Include document purpose, scope, and environment baseline.

**Step 2: Define Launch & Communication (S1-01/02) steps**

- Step: Launch the application.
- Expected: App window opens without errors.
- Step: Verify backend communication (e.g., check logs or a "ping" command if available).
- Expected: Communication successful.

**Step 3: Define File Tree & Selection (S1-04/08/09) steps**

- Step: Click "Open Folder" and select a directory.
- Expected: File tree populates with correct files.
- Step: Click on a markdown file in the tree.
- Expected: File content loads in the editor.
- Step: Modify file A, then click file B.
- Expected: File A is saved (dirty flush) and file B loads.

**Step 4: Define Editor & Markdown (S1-05/06) steps**

- Step: Type text and use shortcuts (Cmd+1/2/3 for headers, Cmd+B/I for bold/italic).
- Expected: Immediate rendering of styles.
- Step: Create a code block using ```.
- Expected: Code block rendered and editable.
- Step: Perform Undo/Redo (Cmd+Z / Cmd+Shift+Z).
- Expected: Changes reverted/re-applied correctly.

**Step 5: Define Autosave & Close Protection (S1-07/10) steps**

- Step: Type text and wait > 800ms.
- Expected: File saved to disk (verify timestamp or content).
- Step: Modify file and immediately close the application.
- Expected: Content is saved before exit.

**Step 6: Finalize and Commit**
Review the document for clarity and completeness.

```bash
git add docs/current/QA_CHECKLIST_V1.md
git commit -m "docs: add Sprint 1 regression checklist (S1-12)"
```
