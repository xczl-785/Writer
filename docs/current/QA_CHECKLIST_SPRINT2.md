# QA Checklist Sprint 2 (File Management Loop)

## 1. Purpose

This document provides a standardized manual regression script for Sprint 2 features, focusing on the file management loop within a single workspace. It ensures that users can manage their files and folders directly within the application without data loss or UI inconsistencies.

## 2. Scope

- **Sprint 2 Features**: Create File/Folder, Rename File/Folder, Delete File/Folder, Sidebar UI (Icons), and Dirty-file Safety.
- **Core Flow**: Create -> Rename -> Edit -> Delete.
- **Quality Goals**: Atomic file operations, consistent UI state, safety for unsaved changes.

## 3. Regression Prerequisites (Workspace Setup)

Before starting the tests, ensure the following environment is set up:

- **Workspace**: A dedicated local directory for testing.
- **Initial State**:
  - The workspace should be opened in the application.
  - Prepare at least one existing markdown file (`existing.md`) with some content.
  - Ensure the application has write permissions to this directory.

## 4. Manual Regression Script

### 4.1 Create File & Folder (S2-03)

| ID            | Action                                     | Expected Result                                                                                       | Status |
| :------------ | :----------------------------------------- | :---------------------------------------------------------------------------------------------------- | :----- |
| **QA-S2-03a** | Click "New File" button/menu in sidebar.   | A new `.md` file is created; file tree refreshes; the new file is automatically opened in the editor. | [ ]    |
| **QA-S2-03b** | Click "New Folder" button/menu in sidebar. | A new folder is created; file tree refreshes; the folder is visible in the tree.                      | [ ]    |
| **QA-S2-03c** | Create a file inside a subfolder.          | File is created at the correct path; tree structure correctly displays the nesting.                   | [ ]    |

### 4.2 Rename File & Folder (S2-04)

| ID            | Action                            | Expected Result                                                             | Status |
| :------------ | :-------------------------------- | :-------------------------------------------------------------------------- | :----- |
| **QA-S2-04a** | Rename an inactive file.          | File name updates in the sidebar; file on disk is renamed.                  | [ ]    |
| **QA-S2-04b** | Rename the currently active file. | Sidebar updates; editor title/path updates; content remains intact.         | [ ]    |
| **QA-S2-04c** | Rename a folder containing files. | Folder name updates; all nested files remain accessible under the new path. | [ ]    |

### 4.3 Delete File & Folder (S2-05)

| ID            | Action                                     | Expected Result                                                                        | Status |
| :------------ | :----------------------------------------- | :------------------------------------------------------------------------------------- | :----- |
| **QA-S2-05a** | Delete a file (trigger delete -> confirm). | Confirmation dialog appears; file is removed from sidebar and disk after confirmation. | [ ]    |
| **QA-S2-05b** | Delete the currently active file.          | Confirmation dialog appears; file is deleted; editor is closed or cleared.             | [ ]    |
| **QA-S2-05c** | Delete a non-empty folder.                 | Confirmation dialog appears; folder and all its contents are removed from disk.        | [ ]    |

### 4.4 Dirty-file Safety (S2-06)

| ID            | Action                              | Expected Result                                                                           | Status |
| :------------ | :---------------------------------- | :---------------------------------------------------------------------------------------- | :----- |
| **QA-S2-06a** | Rename a file with unsaved changes. | Changes are flushed to disk (or user is prompted) before the rename occurs; no data loss. | [ ]    |
| **QA-S2-06b** | Delete a file with unsaved changes. | Confirmation dialog warns about unsaved changes; if cancelled, file and changes remain.   | [ ]    |

### 4.5 Negative & Error Paths

| ID               | Action                                                    | Expected Result                                                                | Status |
| :--------------- | :-------------------------------------------------------- | :----------------------------------------------------------------------------- | :----- |
| **QA-S2-ERR-01** | Create/Rename to a name that already exists.              | UI shows an error message (e.g., "File already exists"); operation is aborted. | [ ]    |
| **QA-S2-ERR-02** | Attempt to delete/rename a file with "Permission Denied". | UI displays a clear error message; state remains consistent.                   | [ ]    |
| **QA-S2-ERR-03** | Use invalid characters in file/folder name.               | UI prevents the action or shows a validation error.                            | [ ]    |

## 5. Acceptance Summary

### Current Implemented Scope

- **FsService CRUD**: Full support for create, rename, and delete operations on files and folders.
- **Sidebar UI**: Integrated `lucide-react` icons; added action buttons for file management.
- **Editor Linkage**: Automatic updates for active file renaming and closing on deletion.
- **Safety**: Dirty state handling ensures no silent data loss during management operations.

### Out of Scope (Sprint 2)

- **Drag & Drop**: Moving files via mouse interaction is not implemented.
- **Search**: File/Content search is deferred to later sprints.
- **Multi-tabs**: Application remains in single-editor mode.
- **Image Management**: Handling of non-markdown assets is out of scope.

## 6. Approval Criteria

1. All **QA-S2-xx** items marked as [x].
2. All **QA-S2-ERR-xx** items marked as [x].
3. No P0 bugs (Data loss, Crash on file operation, UI desync).
