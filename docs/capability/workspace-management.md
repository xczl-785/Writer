# workspace-management

## Quick Read

- **id**: `workspace-management`
- **name**: 工作区管理
- **summary**: 管理工作区的打开、关闭、文件夹添加/移除、状态持久化，支持单文件夹和多文件夹工作区
- **scope**: 包括工作区加载/关闭、文件夹管理、文件打开/关闭、状态持久化、文件监听联动；不包括文件系统操作本身、文件树 UI 渲染
- **entry_points**:
  - workspaceActions 方法调用
  - WorkspaceManager 对话框方法调用
- **shared_with**: none
- **check_on_change**:
  - workspaceActions API 不变
  - 工作区状态管理逻辑不变
  - 文件监听联动正确
- **last_verified**: 2026-03-20

---

## Capability Summary

工作区管理能力负责协调工作区的完整生命周期，包括打开文件夹/工作区文件、关闭工作区、添加/移除文件夹、打开/关闭文件、状态持久化等。采用快照-回滚机制确保多文件夹操作的原子性，与 FileWatcherService 联动实现外部文件变化感知。workspaceActions 是核心事务协调器，WorkspaceManager 封装对话框交互和路径处理。

---

## Entries

| Entry                                      | Trigger                  | Evidence                                                     | Notes             |
| ------------------------------------------ | ------------------------ | ------------------------------------------------------------ | ----------------- |
| workspaceActions.openFile                  | 打开单个文件             | `src/domains/workspace/services/workspaceActions.ts:206-223` | 先 flush 脏文件   |
| workspaceActions.loadWorkspace             | 加载单文件夹工作区       | `src/domains/workspace/services/workspaceActions.ts:225-253` | V5 兼容模式       |
| workspaceActions.closeWorkspace            | 关闭工作区               | `src/domains/workspace/services/workspaceActions.ts:261-310` | 支持脏文件确认    |
| workspaceActions.addFolderToWorkspace      | 添加文件夹到工作区       | `src/domains/workspace/services/workspaceActions.ts:322-374` | 带快照回滚        |
| workspaceActions.removeFolderFromWorkspace | 从工作区移除文件夹       | `src/domains/workspace/services/workspaceActions.ts:376-399` | 带快照回滚        |
| workspaceActions.saveWorkspaceFile         | 保存工作区文件           | `src/domains/workspace/services/workspaceActions.ts:522-550` | 转换为相对路径    |
| workspaceActions.loadWorkspaceFile         | 加载工作区文件           | `src/domains/workspace/services/workspaceActions.ts:552-764` | 解析 + 批量加载   |
| workspaceActions.moveNode                  | 移动文件/目录            | `src/domains/workspace/services/workspaceActions.ts:424-518` | 跨根文件夹支持    |
| WorkspaceManager.openFileWithDialog        | 通过对话框打开文件       | `src/domains/workspace/services/WorkspaceManager.ts:93-143`  | 调用 Tauri dialog |
| WorkspaceManager.openWorkspace             | 通过对话框打开文件夹     | `src/domains/workspace/services/WorkspaceManager.ts`         | 调用 Tauri dialog |
| WorkspaceManager.openWorkspaceFile         | 通过对话框打开工作区文件 | `src/domains/workspace/services/WorkspaceManager.ts`         | 调用 Tauri dialog |

---

## Current Rules

### CR-001: 快照-回滚机制

`addFolderToWorkspace` 和 `removeFolderFromWorkspace` 在操作前快照当前状态，失败时回滚到快照状态。

**Evidence**: `src/domains/workspace/services/workspaceActions.ts:332-336, 369-373, 377-381, 394-397`

---

### CR-002: 文件监听联动

工作区加载/关闭/文件夹变更时，同步更新 FileWatcherService 的监听路径。

**Evidence**: `src/domains/workspace/services/workspaceActions.ts:150-154, 250, 365, 755`

---

### CR-003: 脏文件 flush 前置

打开新文件或关闭工作区前，必须先 flush 当前脏文件。

**Evidence**: `src/domains/workspace/services/workspaceActions.ts:209-217, 262-295`

---

### CR-004: 工作区状态持久化

工作区状态通过 WorkspaceStatePersistence 持久化到 JSON 文件，包括 folders、openFiles、activeFile。

**Evidence**: `src/domains/workspace/services/workspaceActions.ts:361, 539-540`

---

### CR-005: 工作区文件路径相对化

保存工作区文件时，绝对路径转换为相对于工作区文件的相对路径。

**Evidence**: `src/domains/workspace/services/workspaceActions.ts:527-530`

---

### CR-006: 工作区文件路径绝对化

加载工作区文件时，相对路径通过 resolvePath 转换为绝对路径。

**Evidence**: `src/domains/workspace/services/workspaceActions.ts:592-596`

---

### CR-007: 批量加载 + 单独回退

加载工作区文件时，优先使用 listTreeBatch 批量加载，失败时回退到单独 listTree。

**Evidence**: `src/domains/workspace/services/workspaceActions.ts:603, 673`

---

### CR-008: 关闭工作区确认对话框

关闭工作区时，如有脏文件，显示确认对话框让用户选择保存或放弃。

**Evidence**: `src/domains/workspace/services/workspaceActions.ts:265-295`

---

## Impact Surface

| Area                      | What to check            | Evidence                                                      |
| ------------------------- | ------------------------ | ------------------------------------------------------------- |
| workspaceActions API      | 所有方法签名不变         | `src/domains/workspace/services/workspaceActions.ts`          |
| WorkspaceManager          | 对话框交互和路径处理正确 | `src/domains/workspace/services/WorkspaceManager.ts`          |
| workspaceStore            | 状态管理逻辑正确         | `src/domains/workspace/state/workspaceStore.ts`               |
| fileTreeStore             | 文件树状态同步正确       | `src/domains/file/state/fileStore.ts`                         |
| FileWatcherService        | 文件监听联动正确         | `src/services/filewatcher/`                                   |
| WorkspaceStatePersistence | 状态持久化正确           | `src/domains/workspace/services/WorkspaceStatePersistence.ts` |
| RecentItemsService        | 最近项目记录正确         | `src/domains/workspace/services/RecentItemsService.ts`        |
| 测试覆盖                  | 相关测试通过             | `src/domains/workspace/services/*.test.ts`                    |

---

## Shared Rules Dependency

| Shared Rule | Dependency                 | Lifted |
| ----------- | -------------------------- | ------ |
| none        | No shared rules identified | no     |

---

## Uncertainties

- None currently identified.

---

## Known Consumers

| Consumer         | Usage                  | Evidence                                             |
| ---------------- | ---------------------- | ---------------------------------------------------- |
| App.tsx          | 工作区初始化和状态管理 | `src/app/App.tsx`                                    |
| fileCommands     | 文件菜单命令调用       | `src/app/commands/fileCommands.ts`                   |
| WorkspaceManager | 对话框交互             | `src/domains/workspace/services/WorkspaceManager.ts` |
| FileTreeNode     | 文件树节点交互         | `src/domains/file/ui/FileTreeNode.tsx`               |

---

## Archive Pointer

- None. This is a first-version capability document.

---

## 2026-03-28 Current Truth Update

### CT-001: User-triggered workspace operation failures route to Level 2

WorkspaceManager open/load/save/add-folder failures now use `ErrorService.handleWithInfo(...)`
with `level: 'level2'` instead of directly writing status-bar errors.

**Evidence**: `src/domains/workspace/services/WorkspaceManager.ts`

### CT-002: Workspace drag/drop gating remains outside the notification system

Rules such as `workspace.dragFoldersOnly` and editor-drop-disabled remain on the existing
status/gate path and are not promoted to Level 2 or Level 3.

**Evidence**: `src/app/App.tsx`, `src/domains/workspace/services/WorkspaceManager.ts`

### CT-003: Open-style workspace failures are the canonical Level 2 cases

The following workspace flows belong to Level 2:

- open file
- open folder / workspace
- reopen from recent items
- open from startup path
- save/load workspace file when the failure occurs inside the app layer

These failures should provide retry actions through the global notification lane instead of
falling back to status-bar-only errors.

**Evidence**: `src/domains/workspace/services/WorkspaceManager.ts`, `src/app/App.tsx`, `src/services/error/retryActions.ts`

### CT-004: Sidebar tree drag/drop accepts folders directly and files as parent-directory proxies

When a user drags a file or folder inside the sidebar tree, dropping on a directory still resolves
to that directory. Dropping on a file resolves to the file's parent directory, so the dragged node
moves beside the hovered file rather than treating the file itself as a container.

This keeps the desktop tree interaction aligned with common file explorers while preserving the
existing invalid-target protections for self and descendant drops.

**Evidence**: `src/ui/sidebar/dragDropTargets.ts`, `src/ui/sidebar/Sidebar.tsx`

### CT-005: moveNode normalizes parent-path derivation through shared path utilities

`workspaceActions.moveNode(...)` now derives basename, parent paths, descendant checks, and joined
destination paths through shared path helpers instead of manual string slicing. This keeps Windows
backslash inputs and normalized slash inputs behaviorally equivalent, including sibling drops
(`above` / `below`) where the target path itself may still contain backslashes.

**Evidence**: `src/domains/workspace/services/workspaceActions.ts`
