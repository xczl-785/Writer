# V2 Sprint 2-4 Closeout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete V2 Sprint 2-4 documentation closeout and archiving.

**Architecture:** Sequential document creation, update, and file movement.

**Tech Stack:** Markdown, Bash.

---

### Task 1: Create Sprint 3 QA Checklist

**Files:**

- Create: `docs/current/QA_CHECKLIST_SPRINT3_V2.md`

**Step 1: Write the document content**
Content based on Sprint 3 goals: Search experience, Replace enhancements, Failure recovery.

**Step 2: Verify file exists**
Run: `ls docs/current/QA_CHECKLIST_SPRINT3_V2.md`

**Step 3: Commit**

```bash
git add docs/current/QA_CHECKLIST_SPRINT3_V2.md
git commit -m "docs: create Sprint 3 QA checklist"
```

### Task 2: Create Sprint 4 QA Checklist

**Files:**

- Create: `docs/current/QA_CHECKLIST_SPRINT4_V2.md`

**Step 1: Write the document content**
Content based on Sprint 4 goals: Full regression, Platform matrix (Windows pending), Release audit.

**Step 2: Verify file exists**
Run: `ls docs/current/QA_CHECKLIST_SPRINT4_V2.md`

**Step 3: Commit**

```bash
git add docs/current/QA_CHECKLIST_SPRINT4_V2.md
git commit -m "docs: create Sprint 4 QA checklist"
```

### Task 3: Update Requirement Tracking Ledger

**Files:**

- Modify: `docs/current/全流程需求跟踪台账.md`

**Step 1: Move REQ-V2-02 and REQ-V2-03 to Completed section**
Update status to "已完成", set evidence path to `docs/archive/2026-02-17_v2-sprint2-4-closeout/`.

**Step 2: Commit**

```bash
git add docs/current/全流程需求跟踪台账.md
git commit -m "docs: update requirement tracking ledger for V2 Sprint 2-4"
```

### Task 4: Update Requirement Traceability Matrix

**Files:**

- Modify: `docs/current/V2 需求追溯矩阵.md`

**Step 1: Update FR2-02 and FR2-03 status**
Set status to "Sprint2 已完成", QA to "已通过", evidence to `docs/archive/2026-02-17_v2-sprint2-4-closeout/`.

**Step 2: Commit**

```bash
git add "docs/current/V2 需求追溯矩阵.md"
git commit -m "docs: update traceability matrix for V2 Sprint 2-4"
```

### Task 5: Update V2 Startup Kanban

**Files:**

- Modify: `docs/current/V2启动看板.md`

**Step 1: Add Sprint 3 and Sprint 4 completion status**
Include note about Windows verification pending for Sprint 4.

**Step 2: Commit**

```bash
git add docs/current/V2启动看板.md
git commit -m "docs: update V2 startup kanban with Sprint 3/4 status"
```

### Task 6: Update README

**Files:**

- Modify: `docs/current/README.md`

**Step 1: Reset Current Sprint and add Archive entry**
Set "Current Sprint" to "待创建", add `2026-02-17_v2-sprint2-4-closeout` to archived list.

**Step 2: Commit**

```bash
git add docs/current/README.md
git commit -m "docs: update README for V2 Sprint 2-4 closeout"
```

### Task 7: Archive Execution Documents

**Files:**

- Create: `docs/archive/2026-02-17_v2-sprint2-4-closeout/`
- Move: `docs/current/Sprint[2-4]任务拆分_V2.md`, `docs/current/QA_CHECKLIST_SPRINT[2-4]_V2.md`

**Step 1: Create archive directory**
Run: `mkdir -p docs/archive/2026-02-17_v2-sprint2-4-closeout`

**Step 2: Move files**
Run: `mv docs/current/Sprint2任务拆分_V2.md docs/current/QA_CHECKLIST_SPRINT2_V2.md docs/current/Sprint3任务拆分_V2.md docs/current/QA_CHECKLIST_SPRINT3_V2.md docs/current/Sprint4任务拆分_V2.md docs/current/QA_CHECKLIST_SPRINT4_V2.md docs/archive/2026-02-17_v2-sprint2-4-closeout/`

**Step 3: Verify current directory is clean of these files**
Run: `ls docs/current/`

**Step 4: Commit**

```bash
git add docs/current/ docs/archive/2026-02-17_v2-sprint2-4-closeout/
git commit -m "docs: archive V2 Sprint 2-4 execution documents"
```
