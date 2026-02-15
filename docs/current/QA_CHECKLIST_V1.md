# QA Checklist V1 (Sprint 1 Regression)

## 1. Purpose

This document provides a standardized manual regression script for Sprint 1 features. It ensures that every release meets the "Minimum Writable Loop" criteria and maintains data integrity.

## 2. Scope

- **Sprint 1 Features**: Launch, File Tree, Editor, Autosave, and Close Protection.
- **Core Flow**: Open Folder -> Select File -> Edit -> Autosave -> Close & Reopen.
- **Quality Goals**: No silent data loss, visible error feedback, reproducible regression.

## 3. Environment Baseline

- **Platform**: macOS (Primary) / Windows (Secondary).
- **Workspace**: Single root directory.
- **Sample Files**:
  - `sample-plain.md`: Plain text paragraphs.
  - `sample-list.md`: Bullet and numbered lists.
  - `sample-code.md`: Code blocks.

---

## 4. Manual Regression Script

### 4.1 Launch & Communication (S1-01, S1-02)

| ID           | Action                                               | Expected Result                                                          | Status |
| :----------- | :--------------------------------------------------- | :----------------------------------------------------------------------- | :----- |
| **QA-S1-01** | Double-click the application icon to launch.         | Application window opens; UI loads without white screen or fatal errors. | [ ]    |
| **QA-S1-02** | Check the status bar or logs for backend connection. | Backend (Tauri) communication is active; no "Connection Failed" alerts.  | [ ]    |

### 4.2 File Tree & Selection (S1-04, S1-08, S1-09)

| ID           | Action                                                           | Expected Result                                                                    | Status |
| :----------- | :--------------------------------------------------------------- | :--------------------------------------------------------------------------------- | :----- |
| **QA-S1-08** | Click "Open Folder" (or use Cmd+O) and select a local directory. | File tree populates with the directory structure; markdown files are visible.      | [ ]    |
| **QA-S1-04** | Click on a `.md` file in the file tree.                          | File content is read and displayed in the editor correctly.                        | [ ]    |
| **QA-S1-09** | 1. Modify File A.<br>2. Immediately click File B in the tree.    | 1. File A is saved to disk (Dirty Flush).<br>2. File B content loads successfully. | [ ]    |

### 4.3 Editor & Markdown (S1-05, S1-06)

| ID            | Action                                                               | Expected Result                                                                    | Status |
| :------------ | :------------------------------------------------------------------- | :--------------------------------------------------------------------------------- | :----- |
| **QA-S1-06a** | Type text into the editor.                                           | Text appears immediately; rendering is smooth.                                     | [ ]    |
| **QA-S1-06b** | Use shortcuts: `Cmd+1`, `Cmd+2`, `Cmd+3`.                            | Current line transforms into H1, H2, or H3 respectively.                           | [ ]    |
| **QA-S1-06c** | Select text and press `Cmd+B` or `Cmd+I`.                            | Text becomes **Bold** or _Italic_ immediately.                                     | [ ]    |
| **QA-S1-06d** | Type ` ``` ` and press Enter.                                        | A code block is created; syntax highlighting (if any) or block styling is visible. | [ ]    |
| **QA-S1-06e** | Press `Cmd+Z` and `Cmd+Shift+Z`.                                     | Last edit is undone and then redone correctly.                                     | [ ]    |
| **QA-S1-05**  | 1. Edit a file with various styles.<br>2. Close and reopen the file. | Markdown serialization/parsing is consistent; no semantic loss (Roundtrip).        | [ ]    |

### 4.4 Autosave & Close Protection (S1-07, S1-10)

| ID           | Action                                                                                                  | Expected Result                                                                  | Status |
| :----------- | :------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------- | :----- |
| **QA-S1-07** | Type a sentence and wait for 1 second without clicking anything.                                        | "Saving..." indicator appears/disappears; file on disk is updated.               | [ ]    |
| **QA-S1-10** | 1. Modify a file.<br>2. Immediately close the app window (Cmd+Q or Close button).<br>3. Reopen the app. | The last modification is preserved; no data loss occurred during the quick exit. | [ ]    |

### 4.5 Error Handling (S1-11)

| ID           | Action                                            | Expected Result                                                                 | Status |
| :----------- | :------------------------------------------------ | :------------------------------------------------------------------------------ | :----- |
| **QA-S1-11** | Attempt to save to a read-only file or directory. | UI displays a clear error message (e.g., in the status bar); no silent failure. | [ ]    |

---

## 5. Core Regression Scenarios (R-Series)

### R1: The "Writer's Loop"

- **Steps**: Open Folder -> Open File -> Type for 30 seconds -> Wait for Autosave -> Close App -> Reopen.
- **Expected**: All content is perfectly preserved.

### R2: Rapid File Switching

- **Steps**: Edit File A -> Click File B -> Click File A.
- **Expected**: File A's changes are saved; switching is responsive.

### R3: Error Observability

- **Steps**: Manually make a file read-only or disconnect drive, then attempt to edit/save.
- **Expected**: UI shows clear error state; no "fake success".

### R4: Cold/Hot Start Latency

- **Steps**: Measure time from launch to editor being interactive (5 samples each).
- **Expected**: P95 within thresholds defined in NFR.

### R5: Typing Fluency

- **Steps**: Type continuously in a 50KB+ file for 60 seconds.
- **Expected**: No dropped characters; responsive rendering.

### R6: Atomic Write Integrity

- **Steps**: Check file hash before and after a failed save attempt.
- **Expected**: Original file remains unchanged; no corruption.

---

## 6. Non-Functional Requirements (NFR)

| ID         | Metric                             | Threshold                                      | Result |
| :--------- | :--------------------------------- | :--------------------------------------------- | :----- |
| **NFR-01** | Cold Start TTC (Time to Clickable) | P95 <= 1800ms                                  |        |
| **NFR-02** | Hot Start TTC                      | P95 <= 900ms                                   |        |
| **NFR-03** | Typing Latency                     | P95 <= 33ms                                    |        |
| **NFR-04** | File Safety                        | Atomic write failure does not corrupt original |        |

---

## 7. Approval Criteria

1. All **QA-S1-xx** items marked as [x].
2. All **R-Series** scenarios passed.
3. No P0 bugs (Data loss, Crash on launch, Silent save failure).
