# V6 工作区开发计划与 Commit 清单

**版本**: V6  
**分支**: `feature/v6-workspace`  
**开始日期**: 2026-03-11  
**预计完成**: 2026-04-15（5 周）

---

## 开发流程说明

### Commit 策略
- 每个独立功能提交为一个 commit
- commit 信息遵循 Conventional Commits 规范
- 每个 commit 在本文档中标注验证范围和测试用例

### 测试策略
- 开发者基于最新代码进行全范围测试
- 如发现问题，回退 commit 定位问题来源
- 每个 commit 的验证用例在本文档中明确标注

---

## Phase 0: 后端基础设施（预计 6 个 commit）

### Commit 0-1: 添加 WorkspaceAllowlist 安全层

**预计提交**: 第 1 天  
**文件范围**:
- `src-tauri/src/security.rs` (新建)
- `src-tauri/src/lib.rs` (修改)

**验证范围**:
- [ ] 路径穿越攻击被阻止
- [ ] 工作区边界检查正确
- [ ] 新文件路径验证通过

**测试用例**:
```rust
#[test]
fn test_validate_path_traversal_blocked() {
    // "../etc/passwd" should be blocked
}

#[test]
fn test_validate_path_inside_workspace() {
    // Valid path inside workspace should pass
}

#[test]
fn test_validate_new_file_path() {
    // New file path with must_exist=false should pass
}
```

---

### Commit 0-2: 实现 list_tree_batch 并行命令

**预计提交**: 第 2 天  
**文件范围**:
- `src-tauri/src/fs.rs` (修改)
- `src-tauri/Cargo.toml` (添加 tokio 依赖)

**验证范围**:
- [ ] 批量加载多个文件夹
- [ ] 并发限制生效（最大 8 线程）
- [ ] 单个文件夹失败不影响其他文件夹

**测试用例**:
```rust
#[test]
fn test_batch_load_multiple_folders() {
    // Should load all folders successfully
}

#[test]
fn test_batch_load_with_concurrency_limit() {
    // Should not exceed 8 concurrent threads
}

#[test]
fn test_batch_load_partial_failure() {
    // One folder fails, others should still load
}
```

---

### Commit 0-3: 实现工作区文件命令

**预计提交**: 第 3 天  
**文件范围**:
- `src-tauri/src/fs.rs` (修改)
- `src-tauri/Cargo.toml` (添加 tempfile 依赖)

**功能**:
- `parse_workspace_file` - 解析工作区文件
- `save_workspace_file` - 保存工作区文件（原子写入）
- `resolve_relative_path` - 解析相对路径

**验证范围**:
- [ ] 工作区文件解析正确
- [ ] 原子写入成功（无中间状态）
- [ ] 相对路径解析正确

**测试用例**:
```rust
#[test]
fn test_parse_workspace_file() {
    // Should parse valid workspace file
}

#[test]
fn test_save_workspace_file_atomic() {
    // Should not leave temp file on success
}

#[test]
fn test_resolve_relative_path() {
    // Should resolve "../docs" correctly
}
```

---

### Commit 0-4: 实现文件监听系统

**预计提交**: 第 4 天  
**文件范围**:
- `src-tauri/src/watcher.rs` (新建)
- `src-tauri/src/lib.rs` (修改)
- `src-tauri/Cargo.toml` (添加 notify 依赖)

**验证范围**:
- [ ] 文件变化被正确检测
- [ ] 事件推送到前端
- [ ] 停止监听正常工作
- [ ] watcher 生命周期管理正确

**测试用例**:
```rust
#[test]
fn test_file_change_detected() {
    // Modifying a file should trigger event
}

#[test]
fn test_watcher_lifecycle() {
    // Start -> Stop should clean up resources
}
```

---

### Commit 0-5: 前端状态模型重构

**预计提交**: 第 5 天  
**文件范围**:
- `src/state/slices/workspaceSlice.ts` (重构)
- `src/state/slices/filetreeSlice.ts` (扩展)
- `src/state/types.ts` (新增类型)

**验证范围**:
- [ ] folders[] 替代 currentPath
- [ ] 多根文件树数据结构正确
- [ ] V5 → V6 迁移正常

**测试用例**:
```typescript
test('workspaceSlice should use folders array', () => {});
test('filetreeSlice should support multiple roots', () => {});
test('migration from V5 should work', () => {});
```

---

### Commit 0-6: 实现 workspaceActions 协调器

**预计提交**: 第 6 天  
**文件范围**:
- `src/state/actions/workspaceActions.ts` (新建)
- `src/services/workspace/WorkspaceStatePersistence.ts` (新建)

**验证范围**:
- [ ] 快照 - 回滚机制工作正常
- [ ] 多 store 同步更新
- [ ] 失败时正确回滚

**测试用例**:
```typescript
test('addFolderToWorkspace should rollback on failure', () => {});
test('removeFolderFromWorkspace should close open files', () => {});
```

---

## Phase 1: 核心多文件夹支持（预计 5 个 commit）

### Commit 1-1: 添加文件夹到工作区 UI

**预计提交**: 第 7 天  
**文件范围**:
- `src/ui/sidebar/MultiRootFileTree.tsx` (新建)
- `src/ui/sidebar/WorkspaceRootHeader.tsx` (新建)

**验证范围**:
- [ ] 多根文件树正确渲染
- [ ] 根文件夹展开/折叠正常
- [ ] 右键菜单显示正确

---

### Commit 1-2: 工作区文件保存/打开 UI

**预计提交**: 第 8 天  
**文件范围**:
- `src/ui/components/WorkspaceSaveDialog.tsx` (新建)
- `src/ui/components/WorkspaceOpenDialog.tsx` (新建)

---

### Commit 1-3: 最近工作区功能

**预计提交**: 第 9 天  
**文件范围**:
- `src/services/workspace/WorkspaceMetadataService.ts` (新建)
- `src/ui/components/RecentWorkspacesMenu.tsx` (新建)

---

### Commit 1-4: 空状态界面

**预计提交**: 第 10 天  
**文件范围**:
- `src/ui/workspace/EmptyStateWorkspace.tsx` (新建)
- `src/ui/workspace/EmptyStateWorkspace.css` (新建)

---

### Commit 1-5: 启动恢复逻辑

**预计提交**: 第 11 天  
**文件范围**:
- `src/app/App.tsx` (修改)
- `src/services/workspace/WorkspaceStatePersistence.ts` (修改)

---

## Phase 2: UI 开发（依赖 UI 设计稿，预计 5 个 commit）

### Commit 2-1: 拖拽功能实现

### Commit 2-2: 最近文件功能完善

### Commit 2-3: 工作区指示器

### Commit 2-4: 文件冲突对话框

### Commit 2-5: 边缘情况处理

---

## Commit 历史与验证记录

| Commit Hash | Commit 信息 | 日期 | 验证状态 | 备注 |
|-------------|-------------|------|----------|------|
| 322f93d | feat(security): 添加 WorkspaceAllowlist 安全层 | 2026-03-11 | ✅ 待验证 | Phase 0-1 完成 |

---

## 验证用例执行记录

### Phase 0 验证

| Commit | 验证人 | 验证日期 | 结果 | 备注 |
|--------|--------|----------|------|------|
| 0-1 (322f93d) | - | - | ⏳ 待验证 | 4 个单元测试通过 |
| 0-2 | - | - | ⏳ 待验证 | - |
| 0-3 | - | - | ⏳ 待验证 | - |
| 0-4 | - | - | ⏳ 待验证 | - |
| 0-5 | - | - | ⏳ 待验证 | - |
| 0-6 | - | - | ⏳ 待验证 | - |

---

**文档更新**: 每次提交后更新此文档

**最后更新**: 2026-03-11

---

## 当前进度

**Phase 0-1**: ✅ 已完成 (Commit: 322f93d)
- WorkspaceAllowlist 安全层实现
- 4 个单元测试全部通过
- 已集成到 lib.rs 全局状态管理
