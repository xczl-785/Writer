# V6 Phase 0 测试用例文档

**版本**: V6  
**分支**: `feature/v6-workspace`  
**测试目标**: 验证 Phase 0 所有功能正确性  
**测试日期**: 2026-03-11  

---

## 测试环境准备

### 前置条件
- [ ] 已切换到 `feature/v6-workspace` 分支
- [ ] 已安装 Rust 工具链 (rustup)
- [ ] 已安装 Node.js 和 pnpm
- [ ] 已运行 `cd src-tauri && cargo build`

### 测试命令
```bash
# Rust 单元测试
cd src-tauri && cargo test --lib

# TypeScript 类型检查
pnpm type-check

# 全范围集成测试（手动）
见下方手动测试用例
```

---

## Commit 0-1: WorkspaceAllowlist 安全层

**Commit Hash**: `322f93d`

### 自动化测试（已实现）

```bash
cd src-tauri && cargo test security --lib
```

**预期结果**:
```
running 4 tests
test security::tests::test_empty_allowlist_allows_all ... ok
test security::tests::test_validate_new_file_path ... ok
test security::tests::test_validate_path_inside_workspace ... ok
test security::tests::test_validate_path_outside_workspace ... ok

test result: ok. 4 passed; 0 failed
```

### 手动测试用例

| 用例 ID | 测试场景 | 操作步骤 | 预期结果 |
|---------|---------|---------|---------|
| SEC-01 | 路径穿越攻击阻止 | 尝试访问 `../etc/passwd` | 返回 `PathTraversal` 错误 |
| SEC-02 | 工作区边界外访问 | 尝试访问 `/etc/passwd`（不在工作区） | 返回 `OutsideWorkspace` 错误 |
| SEC-03 | 新文件路径验证 | 创建工作区内新文件路径（must_exist=false） | 验证通过 |
| SEC-04 | 空列表向后兼容 | 未设置根目录时访问任意路径 | 允许访问（向后兼容） |

---

## Commit 0-2: list_tree_batch 并行命令

**Commit Hash**: `665f313`

### 自动化测试（已实现）

```bash
cd src-tauri && cargo test fs --lib
```

**预期结果**:
```
running 2 tests
test fs::tests::list_tree_only_keeps_markdown_files ... ok
test fs::tests::list_tree_skips_heavy_directories ... ok

test result: ok. 2 passed; 0 failed
```

### 手动测试用例

| 用例 ID | 测试场景 | 操作步骤 | 预期结果 |
|---------|---------|---------|---------|
| BAT-01 | 批量加载多个文件夹 | 调用 `list_tree_batch(["/path1", "/path2", "/path3"])` | 返回 3 个文件夹的树结构 |
| BAT-02 | 并发限制验证 | 加载 20 个文件夹，监控线程数 | 同时运行的线程不超过 8 个 |
| BAT-03 | 部分失败处理 | 加载 3 个文件夹，其中 1 个不存在 | 2 个成功，1 个返回错误 |
| BAT-04 | 空输入处理 | 调用 `list_tree_batch([])` | 返回空数组 |
| BAT-05 | 超限输入处理 | 调用 `list_tree_batch` 传入 21 个路径 | 返回错误 "Too many paths" |

### Tauri 命令测试

```typescript
// 在前端调用测试
import { invoke } from '@tauri-apps/api/core';

const result = await invoke('list_tree_batch', { 
  paths: ['/path1', '/path2'] 
});
console.log(result); // 应返回 FolderPathResult[]
```

---

## Commit 0-3: 工作区文件命令

**Commit Hash**: `665f313`

### 手动测试用例

| 用例 ID | 测试场景 | 操作步骤 | 预期结果 |
|---------|---------|---------|---------|
| WSF-01 | 解析有效工作区文件 | 调用 `parse_workspace_file` 解析有效 JSON | 返回 WorkspaceConfig 对象 |
| WSF-02 | 解析无效 JSON | 调用 `parse_workspace_file` 解析无效 JSON | 返回解析错误 |
| WSF-03 | 原子保存验证 | 调用 `save_workspace_file` 保存，中途断电 | 不产生损坏文件（temp 文件） |
| WSF-04 | 相对路径解析 | 调用 `resolve_relative_path("../docs", base)` | 返回正确绝对路径 |
| WSF-05 | 路径穿越阻止 | 调用 `resolve_relative_path("../../etc", base)` | 返回错误 "Path traversal" |

### Tauri 命令测试

```typescript
// 解析工作区文件
const config = await invoke('parse_workspace_file', { 
  path: '/path/to/workspace.writer-workspace' 
});

// 保存工作区文件
await invoke('save_workspace_file', { 
  path: '/path/to/workspace.writer-workspace',
  config: { version: 1, folders: [...] }
});

// 解析相对路径
const absolute = await invoke('resolve_relative_path', {
  basePath: '/path/to/workspace.writer-workspace',
  relativePath: 'docs'
});
```

---

## Commit 0-4: 文件监听系统

**Commit Hash**: `0c02605`

### 自动化测试（已实现）

```bash
cd src-tauri && cargo test watcher --lib
```

**预期结果**:
```
running 2 tests
test watcher::tests::test_watcher_state_creation ... ok
test watcher::tests::test_watcher_state_default ... ok

test result: ok. 2 passed; 0 failed
```

### 手动测试用例

| 用例 ID | 测试场景 | 操作步骤 | 预期结果 |
|---------|---------|---------|---------|
| WAT-01 | 开始监听 | 调用 `start_watching(["/path"])` | 返回成功，状态为 running |
| WAT-02 | 文件变化检测 | 修改监听路径中的文件 | 收到 `writer://file-change` 事件 |
| WAT-03 | 停止监听 | 调用 `stop_watching()` | 返回成功，状态为 stopped |
| WAT-04 | 更新监听路径 | 调用 `update_watch_paths(["/new-path"])` | 监听新路径，旧路径停止 |
| WAT-05 | 获取状态 | 调用 `get_watcher_status()` | 返回 is_running, path_count, paths |

### Tauri 命令测试

```typescript
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';

// 监听文件变化事件
const unlisten = await listen('writer://file-change', (event: any) => {
  console.log('File changed:', event.payload);
  // payload: { kind: "Modify", paths: ["/path/to/file.md"] }
});

// 开始监听
await invoke('start_watching', { paths: ['/path/to/watch'] });

// 获取状态
const status = await invoke('get_watcher_status');
console.log(status); // { isRunning: true, pathCount: 1, paths: [...] }

// 停止监听
await invoke('stop_watching');

// 清理监听器
unlisten();
```

---

## Commit 0-5 & 0-6: 前端状态模型 + 事务协调器

**Commit Hash**: `f31693c`

### 自动化测试（待实现）

```bash
pnpm type-check  # TypeScript 类型检查
```

### 手动测试用例

| 用例 ID | 测试场景 | 操作步骤 | 预期结果 |
|---------|---------|---------|---------|
| STM-01 | folders[] 替代 currentPath | 检查 store 初始状态 | currentPath 不存在，folders 存在 |
| STM-02 | 多根文件树数据结构 | 检查 filetreeSlice 状态 | rootFolders[] 存在 |
| STM-03 | 快照 - 回滚机制 | 调用 addFolderToWorkspace，模拟失败 | 状态回滚到快照前 |
| STM-04 | 多 store 同步更新 | 添加文件夹后检查两个 store | workspace 和 filetree 同时更新 |
| STM-05 | isDirty 标记 | 添加/移除文件夹后检查 | isDirty = true |
| STM-06 | 状态持久化 | 调用 saveCurrentState | 状态被保存（stub 输出日志） |

### 前端代码测试

```typescript
import { useWorkspaceStore } from './state/slices/workspaceSlice';
import { useFileTreeStore } from './state/slices/filetreeSlice';
import { workspaceActions } from './state/actions/workspaceActions';

// 测试 1: 检查初始状态
const state = useWorkspaceStore.getState();
console.assert(state.folders !== undefined);
console.assert(state.currentPath === undefined); // 已移除

// 测试 2: 添加文件夹（带快照回滚）
const result = await workspaceActions.addFolderToWorkspace('/path/to/folder');
console.assert(result.ok === true);

// 测试 3: 检查多 store 同步
const wsFolders = useWorkspaceStore.getState().folders;
const ftRoots = useFileTreeStore.getState().rootFolders;
console.assert(wsFolders.length === ftRoots.length);

// 测试 4: 检查 isDirty 标记
console.assert(useWorkspaceStore.getState().isDirty === true);
```

---

## Phase 0 集成测试

### 端到端场景测试

| 场景 ID | 场景描述 | 操作步骤 | 预期结果 |
|---------|---------|---------|---------|
| E2E-01 | 完整工作区创建流程 | 1. 打开文件夹<br>2. 添加第二个文件夹<br>3. 保存工作区<br>4. 关闭工作区<br>5. 重新打开工作区 | 所有步骤成功，状态正确恢复 |
| E2E-02 | 外部文件变化检测 | 1. 打开工作区<br>2. 在外部修改文件<br>3. 检测事件 | 收到 `writer://file-change` 事件 |
| E2E-03 | 事务回滚场景 | 1. 添加文件夹<br>2. 模拟文件树加载失败<br>3. 检查状态 | 状态回滚，无残留 |
| E2E-04 | 安全验证集成 | 1. 尝试访问工作区外路径<br>2. 调用 parse_workspace_file | 返回安全错误 |

---

## 测试结果记录

### 自动化测试结果

| Commit | 测试命令 | 通过数 | 失败数 | 测试人 | 日期 |
|--------|---------|--------|--------|--------|------|
| 322f93d | `cargo test security` | 4 | 0 | - | - |
| 665f313 | `cargo test fs` | 2 | 0 | - | - |
| 0c02605 | `cargo test watcher` | 2 | 0 | - | - |
| f31693c | `pnpm type-check` | - | - | - | - |

### 手动测试结果

| Commit | 用例 ID | 测试结果 | 问题描述 | 测试人 | 日期 |
|--------|---------|---------|---------|--------|------|
| 322f93d | SEC-01 ~ SEC-04 | ⏳ 待测试 | - | - | - |
| 665f313 | BAT-01 ~ BAT-05 | ⏳ 待测试 | - | - | - |
| 665f313 | WSF-01 ~ WSF-05 | ⏳ 待测试 | - | - | - |
| 0c02605 | WAT-01 ~ WAT-05 | ⏳ 待测试 | - | - | - |
| f31693c | STM-01 ~ STM-06 | ⏳ 待测试 | - | - | - |
| All | E2E-01 ~ E2E-04 | ⏳ 待测试 | - | - | - |

---

## 问题追踪

| 问题 ID | 关联用例 | 问题描述 | 严重程度 | 状态 |
|---------|---------|---------|---------|------|
| - | - | - | - | - |

---

**文档创建日期**: 2026-03-11  
**最后更新**: 2026-03-11
