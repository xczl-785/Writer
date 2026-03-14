# 领域驱动重构实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将 Writer 项目重构为领域驱动架构，移除 Git 功能，建立清晰的代码边界。

**Architecture:** 前端按四个领域（file/editor/workspace/settings）组织，后端拆分为三个模块（fs/workspace/config），通过事件总线实现跨领域通信。

**Tech Stack:** React 19 + Zustand 5 + TipTap 3 + Tauri 2 + Rust

---

## Phase 1: 后端重构 ✅ 已完成 (2026-03-14)

> **完成提交:** b3318b6, b6de999, 39dd831, 0491cd5, 5401c79, 54c24d9

### Task 1.1: 创建 workspace.rs 模块 ✅

**Files:**
- Create: `src-tauri/src/workspace.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/fs.rs`

**Step 1: 创建 workspace.rs 文件骨架**

```rust
// src-tauri/src/workspace.rs

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use tauri::State;

use crate::security::WorkspaceAllowlist;

// ==================== Types ====================

#[derive(Debug, Serialize, Deserialize)]
pub struct WorkspaceConfig {
    pub version: u32,
    #[serde(default)]
    pub folders: Vec<WorkspaceFolderConfig>,
    #[serde(default)]
    pub state: Option<WorkspaceStateConfig>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WorkspaceFolderConfig {
    pub path: String,
    pub name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceStateConfig {
    #[serde(alias = "open_files")]
    pub open_files: Option<Vec<String>>,
    #[serde(alias = "active_file")]
    pub active_file: Option<String>,
    #[serde(alias = "sidebar_visible")]
    pub sidebar_visible: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FolderPathResult {
    pub path: String,
    pub nodes: Vec<crate::fs::FileNode>,
    pub error: Option<String>,
}

// ==================== Workspace Lock Types ====================

#[derive(Debug, Serialize, Deserialize)]
pub struct WorkspaceLockInfo {
    pub pid: u32,
    pub locked_at: u64,
    pub description: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WorkspaceLockStatus {
    pub is_locked: bool,
    pub lock_info: Option<WorkspaceLockInfo>,
}

// ==================== Commands ====================

// Commands will be migrated from fs.rs in subsequent steps
```

**Step 2: 更新 lib.rs 注册模块**

在 `src-tauri/src/lib.rs` 中添加模块声明：

```rust
mod config;
mod fs;
mod menu;
mod security;
mod watcher;
mod workspace;  // 新增
```

**Step 3: 验证编译通过**

Run: `cd src-tauri && cargo check`
Expected: 编译通过，无错误

**Step 4: Commit**

```bash
git add src-tauri/src/workspace.rs src-tauri/src/lib.rs
git commit -m "refactor(backend): 创建 workspace.rs 模块骨架"
```

---

### Task 1.2: 迁移工作区文件操作到 workspace.rs ✅

**Files:**
- Modify: `src-tauri/src/workspace.rs`
- Modify: `src-tauri/src/fs.rs`

**Step 1: 迁移 parse_workspace_file 函数**

从 `fs.rs` 移动以下函数到 `workspace.rs`:
- `parse_workspace_file`
- `save_workspace_file`
- `resolve_relative_path`

**Step 2: 迁移批量加载函数**

从 `fs.rs` 移动以下函数到 `workspace.rs`:
- `list_tree_batch`
- `build_tree_batch`

**Step 3: 从 fs.rs 删除已迁移的函数**

删除 `fs.rs` 中已迁移的函数定义。

**Step 4: 更新 lib.rs 命令注册**

将命令从 `fs::` 改为 `workspace::`：
- `parse_workspace_file` → `workspace::parse_workspace_file`
- `save_workspace_file` → `workspace::save_workspace_file`
- `resolve_relative_path` → `workspace::resolve_relative_path`
- `list_tree_batch` → `workspace::list_tree_batch`

**Step 5: 验证编译通过**

Run: `cd src-tauri && cargo check`
Expected: 编译通过

**Step 6: Commit**

```bash
git add src-tauri/src/workspace.rs src-tauri/src/fs.rs src-tauri/src/lib.rs
git commit -m "refactor(backend): 迁移工作区文件操作到 workspace.rs"
```

---

### Task 1.3: 迁移工作区锁功能到 workspace.rs ✅

**Files:**
- Modify: `src-tauri/src/workspace.rs`
- Modify: `src-tauri/src/fs.rs`

**Step 1: 迁移锁相关函数**

从 `fs.rs` 移动以下函数到 `workspace.rs`:
- `get_lock_file_path`
- `get_current_pid`
- `get_current_timestamp`
- `is_process_running`
- `check_workspace_lock`
- `acquire_workspace_lock`
- `release_workspace_lock`
- `force_release_workspace_lock`

**Step 2: 更新 lib.rs 命令注册**

将锁相关命令注册更新为 `workspace::`。

**Step 3: 验证编译通过**

Run: `cd src-tauri && cargo check`
Expected: 编译通过

**Step 4: Commit**

```bash
git add src-tauri/src/workspace.rs src-tauri/src/fs.rs src-tauri/src/lib.rs
git commit -m "refactor(backend): 迁移工作区锁功能到 workspace.rs"
```

---

### Task 1.4: 创建 config.rs 模块 ✅

**Files:**
- Create: `src-tauri/src/config.rs`
- Modify: `src-tauri/src/fs.rs`
- Modify: `src-tauri/src/lib.rs`

**Step 1: 创建 config.rs**

从 `fs.rs` 迁移以下函数：
- `get_app_config_dir`
- `read_json_file`
- `write_json_file`

**Step 2: 更新 lib.rs**

添加模块声明和命令注册。

**Step 3: 从 fs.rs 删除**

删除已迁移的函数。

**Step 4: 验证编译通过**

Run: `cd src-tauri && cargo check`
Expected: 编译通过

**Step 5: Commit**

```bash
git add src-tauri/src/config.rs src-tauri/src/fs.rs src-tauri/src/lib.rs
git commit -m "refactor(backend): 创建 config.rs 模块"
```

---

### Task 1.5: 移除 Git 相关代码 ✅

**Files:**
- Modify: `src-tauri/src/fs.rs`

**Step 1: 删除 Git 相关函数**

从 `fs.rs` 删除：
- `run_git` 函数
- `get_git_sync_status` 函数
- `GitSyncStatus` 结构体

**Step 2: 更新 lib.rs**

移除 `get_git_sync_status` 命令注册。

**Step 3: 验证编译通过**

Run: `cd src-tauri && cargo check`
Expected: 编译通过

**Step 4: 运行测试**

Run: `cd src-tauri && cargo test`
Expected: 所有测试通过

**Step 5: Commit**

```bash
git add src-tauri/src/fs.rs src-tauri/src/lib.rs
git commit -m "refactor(backend): 移除 Git 相关功能"
```

---

### Task 1.6: 更新前端 FsService ✅

**Files:**
- Modify: `src/services/fs/FsService.ts`

**Step 1: 移除 Git 相关代码**

删除：
- `GitSyncStatus` 接口定义
- `getGitSyncStatus` 方法

**Step 2: 验证 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: 编译通过

**Step 3: Commit**

```bash
git add src/services/fs/FsService.ts
git commit -m "refactor(frontend): 从 FsService 移除 Git 功能"
```

---

## Phase 2: 前端目录重组 ✅ 已完成 (2026-03-14)

> **完成提交:** 7591c20 (197 files changed)

### Task 2.1: 创建 domains 目录结构

**Files:**
- Create: `src/domains/file/index.ts`
- Create: `src/domains/editor/index.ts`
- Create: `src/domains/workspace/index.ts`
- Create: `src/domains/settings/index.ts`

**Step 1: 创建目录和入口文件**

```bash
mkdir -p src/domains/file/{services,state,ui,hooks}
mkdir -p src/domains/editor/{core,domain,state,ui/components,ui/menus,hooks}
mkdir -p src/domains/workspace/{services,state,ui,hooks}
mkdir -p src/domains/settings/{state,ui}
```

**Step 2: 创建入口文件**

每个 `index.ts` 文件初始内容：

```typescript
// src/domains/file/index.ts
// File domain exports
export * from './services';
export * from './state';
export * from './types';
```

**Step 3: Commit**

```bash
git add src/domains/
git commit -m "refactor(frontend): 创建领域目录结构"
```

---

### Task 2.2: 迁移 File 领域代码

**Files:**
- Move: `src/services/fs/*` → `src/domains/file/services/`
- Move: `src/services/filewatcher/*` → `src/domains/file/services/`
- Move: `src/state/slices/filetreeSlice.ts` → `src/domains/file/state/`
- Move: `src/ui/sidebar/*FileTree*` → `src/domains/file/ui/`

**Step 1: 迁移 services**

```bash
# 创建目标目录
mkdir -p src/domains/file/services

# 迁移文件
mv src/services/fs/FsService.ts src/domains/file/services/
mv src/services/fs/FsSafety.ts src/domains/file/services/
mv src/services/filewatcher/FileWatcherService.ts src/domains/file/services/
```

**Step 2: 迁移 state**

```bash
mv src/state/slices/filetreeSlice.ts src/domains/file/state/fileStore.ts
```

**Step 3: 更新导入路径**

使用 IDE 的重构功能更新所有导入路径。

**Step 4: 验证编译**

Run: `npx tsc --noEmit`
Expected: 编译通过

**Step 5: Commit**

```bash
git add src/domains/file/
git commit -m "refactor(frontend): 迁移 File 领域代码"
```

---

### Task 2.3: 迁移 Editor 领域代码

**Files:**
- Move: `src/ui/editor/core/*` → `src/domains/editor/core/`
- Move: `src/ui/editor/domain/*` → `src/domains/editor/domain/`
- Move: `src/state/slices/editorSlice.ts` → `src/domains/editor/state/`
- Move: `src/ui/editor/components/*` → `src/domains/editor/ui/components/`
- Move: `src/ui/editor/menus/*` → `src/domains/editor/ui/menus/`
- Move: `src/ui/editor/hooks/*` → `src/domains/editor/hooks/`

**Step 1: 迁移目录**

```bash
# 核心代码
mv src/ui/editor/core/* src/domains/editor/core/

# 领域逻辑
mv src/ui/editor/domain/* src/domains/editor/domain/

# 状态
mv src/state/slices/editorSlice.ts src/domains/editor/state/editorStore.ts

# UI 组件
mv src/ui/editor/components/* src/domains/editor/ui/components/

# 菜单组件
mv src/ui/editor/menus/* src/domains/editor/ui/menus/

# Hooks
mv src/ui/editor/hooks/* src/domains/editor/hooks/
```

**Step 2: 迁移主编辑器文件**

```bash
mv src/ui/editor/Editor.tsx src/domains/editor/core/
mv src/ui/editor/EditorImpl.tsx src/domains/editor/core/
```

**Step 3: 更新导入路径**

**Step 4: 验证编译**

Run: `npx tsc --noEmit`

**Step 5: Commit**

```bash
git add src/domains/editor/
git commit -m "refactor(frontend): 迁移 Editor 领域代码"
```

---

### Task 2.4: 迁移 Workspace 领域代码

**Files:**
- Move: `src/workspace/*` → `src/domains/workspace/services/`
- Move: `src/services/workspace/*` → `src/domains/workspace/services/`
- Move: `src/services/recent/*` → `src/domains/workspace/services/`
- Move: `src/state/slices/workspaceSlice.ts` → `src/domains/workspace/state/`
- Move: `src/state/actions/workspaceActions.ts` → `src/domains/workspace/services/`

**Step 1: 迁移文件**

```bash
# 服务
mv src/workspace/WorkspaceManager.ts src/domains/workspace/services/
mv src/services/workspace/WorkspaceStatePersistence.ts src/domains/workspace/services/
mv src/services/workspace/WorkspaceLockService.ts src/domains/workspace/services/
mv src/services/recent/RecentItemsService.ts src/domains/workspace/services/

# 状态
mv src/state/slices/workspaceSlice.ts src/domains/workspace/state/workspaceStore.ts

# Actions（作为服务层的一部分）
mv src/state/actions/workspaceActions.ts src/domains/workspace/services/workspaceActions.ts
```

**Step 2: 更新导入路径**

**Step 3: 验证编译**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add src/domains/workspace/
git commit -m "refactor(frontend): 迁移 Workspace 领域代码"
```

---

### Task 2.5: 迁移 Settings 领域代码

**Files:**
- Move: `src/state/slices/settingsSlice.ts` → `src/domains/settings/state/`
- Move: `src/ui/components/Settings/*` → `src/domains/settings/ui/`

**Step 1: 迁移文件**

```bash
mv src/state/slices/settingsSlice.ts src/domains/settings/state/settingsStore.ts
mv src/ui/components/Settings/SettingsPanel.tsx src/domains/settings/ui/
```

**Step 2: 更新导入路径**

**Step 3: 验证编译**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add src/domains/settings/
git commit -m "refactor(frontend): 迁移 Settings 领域代码"
```

---

### Task 2.6: 创建 shared 目录

**Files:**
- Move: `src/i18n/*` → `src/shared/i18n/`
- Move: `src/ui/components/ContextMenu/*` → `src/shared/components/`
- Move: `src/ui/components/Dialog/*` → `src/shared/components/`
- Move: `src/ui/components/Outline/*` → `src/shared/components/`
- Move: `src/utils/*` → `src/shared/utils/`

**Step 1: 创建目录并迁移**

```bash
mkdir -p src/shared/{components,i18n,utils}

mv src/i18n/* src/shared/i18n/
mv src/ui/components/ContextMenu src/shared/components/
mv src/ui/components/Dialog src/shared/components/
mv src/ui/components/Outline src/shared/components/
mv src/utils/* src/shared/utils/
```

**Step 2: 更新导入路径**

**Step 3: 验证编译**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add src/shared/
git commit -m "refactor(frontend): 创建 shared 共享目录"
```

---

## Phase 3: 清理与测试

### Task 3.1: 删除旧目录

**Files:**
- Delete: `src/services/` (已迁移)
- Delete: `src/state/slices/` (已迁移)
- Delete: `src/ui/editor/` (已迁移)
- Delete: `src/workspace/` (已迁移)

**Step 1: 验证所有代码已迁移**

检查上述目录是否还有文件。

**Step 2: 删除空目录**

```bash
rm -rf src/services
rm -rf src/state/slices
rm -rf src/ui/editor
rm -rf src/workspace
rm -rf src/utils
```

**Step 3: 验证编译**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor(frontend): 删除已迁移的旧目录"
```

---

### Task 3.2: 更新测试文件路径

**Files:**
- Move: 所有 `*.test.ts` 文件到对应领域目录

**Step 1: 迁移测试文件**

```bash
# File 领域测试
mv src/services/fs/*.test.ts src/domains/file/services/
mv src/services/autosave/*.test.ts src/domains/file/services/

# Editor 领域测试
mv src/ui/editor/**/*.test.ts src/domains/editor/

# Workspace 领域测试
mv src/workspace/*.test.ts src/domains/workspace/services/
mv src/state/actions/*.test.ts src/domains/workspace/services/
```

**Step 2: 更新测试导入路径**

**Step 3: 运行测试**

Run: `npm test`
Expected: 大部分测试通过（快照式测试可能失败）

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor(test): 迁移测试文件到领域目录"
```

---

### Task 3.3: 移除前端 Git 相关代码

**Files:**
- Modify: `src/ui/statusbar/StatusBar.tsx`

**Step 1: 检查 Git 相关代码**

```bash
grep -r "git\|Git\|GIT" src/domains/ --include="*.ts" --include="*.tsx"
```

**Step 2: 移除 Git 状态显示**

从 `StatusBar.tsx` 中移除 Git 相关的 UI 代码。

**Step 3: 验证编译和测试**

Run: `npx tsc --noEmit && npm test`

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor(frontend): 完全移除 Git 相关 UI"
```

---

## Phase 4: 文档更新

### Task 4.1: 更新技术文档

**Files:**
- Modify: `docs/全局资产/技术/前端架构.md`
- Modify: `docs/全局资产/技术/后端架构.md`
- Modify: `docs/全局资产/技术/服务层设计.md`

**Step 1: 更新前端架构文档**

更新目录结构图，反映新的领域驱动架构。

**Step 2: 更新后端架构文档**

更新模块职责表，添加 workspace.rs 和 config.rs。

**Step 3: 更新服务层设计文档**

更新服务依赖关系图。

**Step 4: Commit**

```bash
git add docs/
git commit -m "docs: 更新技术架构文档"
```

---

### Task 4.2: 更新 AGENTS.md

**Files:**
- Modify: `AGENTS.md`

**Step 1: 更新文档版图**

反映新的目录结构。

**Step 2: 更新关键入口**

更新入口文件路径。

**Step 3: Commit**

```bash
git add AGENTS.md
git commit -m "docs: 更新 AGENTS.md 反映新架构"
```

---

## 验收清单

### Phase 1 验收 ✅
- [x] 后端编译通过：`cd src-tauri && cargo check`
- [x] 后端测试通过：`cd src-tauri && cargo test` (12 tests passed)
- [x] 前端编译通过：`npx tsc --noEmit`
- [x] 无 Git 相关代码残留
- [x] 所有改动已提交 (6 commits)

### Phase 2-4 待验收
- [ ] 前端测试通过：`npm test`（允许快照测试失败）
- [ ] 文档已更新
- [ ] 所有改动已提交