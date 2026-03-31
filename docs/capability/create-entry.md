# create-entry

## Quick Read

- **id**: `create-entry`
- **name**: Create Entry
- **summary**: Create new files and folders in the workspace file tree via multiple entry points (menu, keyboard, toolbar, context menu).
- **scope**: Includes entry routing, base path resolution, ghost node preview, and commit logic. Excludes rename and delete.
- **entry_points**:
  - Menu bar (File → New File / New Folder)
  - Keyboard shortcuts (Cmd/Ctrl+N, Cmd/Ctrl+Shift+N)
  - Sidebar toolbar buttons (FilePlus, FolderPlus)
  - File tree context menu (directory nodes)
  - Workspace root header context menu
- **shared_with**: none
- **check_on_change**:
  - All six entry points still dispatch correctly
  - Ghost node placement matches selection state
  - Path normalization cross-platform behavior
  - Newly created empty folders appear in file tree after commit

---

## Capability Summary

The create-entry capability handles all user-initiated creation of files and folders within the workspace file tree. It resolves the correct parent directory based on current selection and active file state, shows an inline "ghost" input for naming, applies validation rules (auto `.md` extension, invalid character rejection), and commits the new entry via the filesystem service. The capability spans from menu command registration through sidebar ghost node rendering to filesystem commit.

The interaction orchestration (ghost state, target resolution, folder expansion, commit logic) is encapsulated in the `useCreateEntry` hook (`src/ui/sidebar/useCreateEntry.ts`). The Sidebar component consumes this hook and is responsible only for event binding, rendering, and prop forwarding.

---

## Entries

| Entry                         | Trigger                                     | Evidence                                                        | Notes                                               |
| ----------------------------- | ------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------- |
| Menu New File                 | `menu.file.new` command bus dispatch        | `src/app/commands/fileCommands.ts:169-182`                      | Dispatches via `dispatchCreateEntry` → custom event |
| Menu New Folder               | `menu.file.new_folder` command bus dispatch | `src/app/commands/fileCommands.ts:184-198`                      | Same flow as New File                               |
| Keyboard New File             | `Cmd/Ctrl+N` when sidebar focused           | `src/ui/sidebar/explorerKeybindings.ts:19-21`                   | Requires workspace context                          |
| Keyboard New Folder           | `Cmd/Ctrl+Shift+N` when sidebar focused     | `src/ui/sidebar/explorerKeybindings.ts:23-25`                   | Requires workspace context                          |
| Toolbar New File              | FilePlus button click                       | `src/ui/sidebar/Sidebar.tsx:959-969`                            | Disabled when no workspace                          |
| Toolbar New Folder            | FolderPlus button click                     | `src/ui/sidebar/Sidebar.tsx:970-980`                            | Disabled when no workspace                          |
| Context Menu New File         | Right-click on directory                    | `src/shared/components/ContextMenu/fileTreeMenu.tsx:41-58`      | Only shown for directory nodes                      |
| Context Menu New Folder       | Right-click on directory                    | `src/shared/components/ContextMenu/fileTreeMenu.tsx:41-58`      | Same condition as New File                          |
| Root Context Menu New File    | Right-click on workspace root header        | `src/shared/components/ContextMenu/workspaceRootMenu.tsx:34-48` | Always shown                                        |
| Root Context Menu New Folder  | Right-click on workspace root header        | `src/shared/components/ContextMenu/workspaceRootMenu.tsx:34-48` | Always shown                                        |
| Root Header Inline New File   | Click root header new file button           | `src/ui/sidebar/Sidebar.tsx:782-788`                            | Sets parentPath to null                             |
| Root Header Inline New Folder | Click root header new folder button         | `src/ui/sidebar/Sidebar.tsx:789-796`                            | Sets parentPath to null                             |

---

## Current Rules

### CR-001: Base path resolution priority

The create base path is resolved with this priority:

1. Selected path is root with `selectedType === null` → use selected path as base
2. Selected type is `directory` → use selected path as base
3. Selected type is `file` → use parent of selected path (fallback: workspace root)
4. No selection, but active file exists → use parent of active file
5. Nothing selected, no active file → use workspace root

**Evidence**: `src/domains/workspace/services/createEntryTarget.ts:27-54`

---

### CR-002: Ghost target parent path normalization

`resolveCreateGhostTarget` returns `parentPath: null` when the resolved base path equals the root path (after normalization). This causes the ghost node to render at root level.

**Evidence**: `src/domains/workspace/services/createEntryTarget.ts:69-73`

---

### CR-003: Path separator normalization for root comparison

When comparing base path to root path, both are normalized via `normalizePath` before equality check. This ensures cross-platform correctness (e.g., `E:\workspace` vs `E:/workspace`).

**Evidence**: `src/domains/workspace/services/createEntryTarget.ts:69-71`

---

### CR-004: Auto-append .md extension for files

New file names automatically get `.md` extension if the name does not already end with `.md`, `.markdown`, or `.mdx`.

**Evidence**: `src/ui/sidebar/pathing.ts:37-47`

---

### CR-005: Invalid name rejection

Names containing `/` or `\` (after trimming) are rejected. Empty names (after trimming) cancel the operation.

**Evidence**: `src/ui/sidebar/pathing.ts:12-19`

---

### CR-006: Ghost node placement in file tree

Ghost nodes are rendered inside the correct root folder group and the correct parent directory:

- Root-level ghost: matched by `normalizePath(ghostNode.rootPath) === normalizePath(rootFolder.workspacePath) && ghostNode.parentPath === null`
- Nested ghost: matched by `normalizePath(ghostNode.parentPath) === normalizePath(node.path)`

**Evidence**: `src/ui/sidebar/Sidebar.tsx:800-810`, `src/ui/sidebar/Sidebar.tsx:1574-1583`

---

### CR-007: Folder expansion before ghost node display

When creating inside a collapsed directory, the folder is expanded before the ghost node is shown.

**Evidence**: `src/ui/sidebar/useCreateEntry.ts` (`beginCreateWithGhost`)

---

### CR-008: Menu dispatch ensures sidebar visibility

When the sidebar is not visible, `dispatchCreateEntry` opens the sidebar first, then emits the create command via `window.setTimeout(..., 0)`.

**Evidence**: `src/dom/workspace/services/createEntryCommands.ts:67-73`

---

### CR-009: Create commit flow

On commit:

1. Trim name, apply `.md` extension for files
2. Validate name (reject invalid, cancel on empty)
3. Call `FsService.createFile` or `FsService.createDir`
4. Refresh file tree for the target root folder
5. Select the new path
6. If file, open it in the editor
7. Cancel ghost node

Step 4 的树刷新保证新建的空目录也会出现在文件树中（`build_tree` 不再过滤空目录，详见 file-system CR-007）。

**Evidence**: `src/ui/sidebar/useCreateEntry.ts` (`commitCreate`)

---

### CR-010: Workspace required guard

All create commands check `canCreateFromWorkspace(currentPath)` before executing. If no workspace is open, a status error is shown.

**Evidence**: `src/ui/sidebar/explorerCommands.ts:36-48`, `src/ui/sidebar/Sidebar.tsx:964`

---

## Impact Surface

| Area                      | What to check                                                                           | Evidence                                                                                                                                                                                                                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Menu command registration | `menu.file.new` and `menu.file.new_folder` still resolve targets and dispatch correctly | `src/app/commands/fileCommands.ts:169-198`                                                                                                                                                                                                                                             |
| Keyboard shortcuts        | `Cmd/Ctrl+N` and `Cmd/Ctrl+Shift+N` match correct explorer commands                     | `src/ui/sidebar/explorerKeybindings.ts:19-25`                                                                                                                                                                                                                                          |
| Explorer command dispatch | `NEW_FILE` and `NEW_FOLDER` commands route to `beginCreateFile`/`beginCreateFolder`     | `src/ui/sidebar/explorerCommands.ts:35-48`                                                                                                                                                                                                                                             |
| Base path resolution      | All 5 priority cases in `resolveCreateBasePath` still behave correctly                  | `src/domains/workspace/services/createEntryTarget.ts:27-54`                                                                                                                                                                                                                            |
| Ghost node rendering      | Root-level and nested ghost nodes appear in correct folder groups                       | `src/ui/sidebar/Sidebar.tsx:800-810`, `1574-1583`                                                                                                                                                                                                                                      |
| Path normalization        | Mixed separators (`\` vs `/`) handled correctly for root comparison                     | `src/domains/workspace/services/createEntryTarget.ts:69-71`                                                                                                                                                                                                                            |
| File name validation      | Invalid names rejected, `.md` extension auto-appended                                   | `src/ui/sidebar/pathing.ts:12-47`                                                                                                                                                                                                                                                      |
| Context menu integration  | File tree and root header context menus wire create callbacks correctly                 | `src/shared/components/ContextMenu/fileTreeMenu.tsx:41-58`, `src/shared/components/ContextMenu/workspaceRootMenu.tsx:34-48`                                                                                                                                                            |
| Sidebar toolbar buttons   | FilePlus and FolderPlus buttons dispatch correct commands                               | `src/ui/sidebar/Sidebar.tsx:959-980`                                                                                                                                                                                                                                                   |
| Create commit             | FsService calls, tree refresh, file open, status feedback                               | `src/ui/sidebar/useCreateEntry.ts` (`commitCreate`)                                                                                                                                                                                                                                                   |
| Tests                     | Unit tests for base path, integration tests for wiring                                  | `src/domains/workspace/services/createEntryTarget.test.ts`, `src/ui/sidebar/SidebarCreateTargetBehavior.test.ts`, `src/ui/sidebar/SidebarCreateCommandRouting.test.ts`, `src/ui/sidebar/WorkspaceRootHeaderCreateBehavior.test.ts`, `src/app/commands/fileCommandsNewBehavior.test.ts` |

---

## Shared Rules Dependency

| Shared Rule | Dependency                 | Lifted |
| ----------- | -------------------------- | ------ |
| none        | No shared rules identified | no     |

---

## Uncertainties

- None currently identified.

---

## Archive Pointer

- None. This is a first-version capability document.
