# file-system

## Quick Read

- **id**: `file-system`
- **name**: 文件系统操作
- **summary**: 封装所有 Tauri 文件系统操作，提供统一的前端调用入口
- **scope**: 包括文件/目录 CRUD、路径类型检测、编码检测、原子写入、工作区文件解析；不包括自动保存、文件监听、拖拽处理
- **entry_points**:
  - FsService 方法调用
- **shared_with**: none
- **check_on_change**:
  - FsService API 不变
  - Tauri 命令签名同步
  - 类型定义一致
- **last_verified**: 2026-03-21

---

## Capability Summary

文件系统操作能力通过 FsService 封装所有 Tauri 后端文件系统调用，为前端提供统一、类型安全的文件操作入口。支持文件读写、目录创建、节点重命名/删除、原子写入、工作区文件解析、图片保存、配置文件读写等操作。FsService 采用对象字面量实现的单例模式，所有方法均为 async，返回 Promise。

---

## Entries

| Entry                         | Trigger            | Evidence                                         | Notes                         |
| ----------------------------- | ------------------ | ------------------------------------------------ | ----------------------------- |
| FsService.listTree            | 加载目录树         | `src/domains/file/services/FsService.ts:37-39`   | 调用 `list_tree`              |
| FsService.listTreeBatch       | 批量加载多个根目录 | `src/domains/file/services/FsService.ts:41-43`   | 调用 `list_tree_batch`        |
| FsService.readFile            | 读取文件内容       | `src/domains/file/services/FsService.ts:45-47`   | 调用 `read_file`              |
| FsService.writeFileAtomic     | 原子写入文件       | `src/domains/file/services/FsService.ts:49-51`   | 调用 `write_file_atomic`      |
| FsService.createFile          | 创建新文件         | `src/domains/file/services/FsService.ts:64-66`   | 调用 `create_file`            |
| FsService.createDir           | 创建新目录         | `src/domains/file/services/FsService.ts:68-70`   | 调用 `create_dir`             |
| FsService.renameNode          | 重命名/移动节点    | `src/domains/file/services/FsService.ts:72-74`   | 调用 `rename_node`            |
| FsService.deleteNode          | 删除文件或目录     | `src/domains/file/services/FsService.ts:76-78`   | 调用 `delete_node`            |
| FsService.revealInFileManager | 在文件管理器中显示 | `src/domains/file/services/FsService.ts:80-82`   | 调用 `reveal_in_file_manager` |
| FsService.saveImage           | 保存图片（二进制） | `src/domains/file/services/FsService.ts:84-86`   | 调用 `save_image`             |
| FsService.checkExists         | 检查路径是否存在   | `src/domains/file/services/FsService.ts:88-90`   | 调用 `check_exists`           |
| FsService.copyFileWithResult  | 复制文件           | `src/domains/file/services/FsService.ts:98-103`  | 调用 `copy_file_with_result`  |
| FsService.getPathKind         | 获取路径类型       | `src/domains/file/services/FsService.ts:105-107` | 调用 `get_path_kind`          |
| FsService.detectFileEncoding  | 检测文件编码       | `src/domains/file/services/FsService.ts:109-111` | 调用 `detect_file_encoding`   |
| FsService.parseWorkspaceFile  | 解析工作区文件     | `src/domains/file/services/FsService.ts:53-55`   | 调用 `parse_workspace_file`   |
| FsService.saveWorkspaceFile   | 保存工作区文件     | `src/domains/file/services/FsService.ts:57-62`   | 调用 `save_workspace_file`    |
| FsService.getAppConfigDir     | 获取应用配置目录   | `src/domains/file/services/FsService.ts:114-116` | 调用 `get_app_config_dir`     |
| FsService.readJsonFile        | 读取 JSON 配置文件 | `src/domains/file/services/FsService.ts:118-120` | 调用 `read_json_file`         |
| FsService.writeJsonFile       | 写入 JSON 配置文件 | `src/domains/file/services/FsService.ts:122-124` | 调用 `write_json_file`        |

---

## Current Rules

### CR-001: FsService 使用对象字面量单例模式

FsService 采用对象字面量实现，所有方法为 async，返回 Promise。不使用 class，不需要实例化。

**Evidence**: `src/domains/file/services/FsService.ts:36`

---

### CR-002: 所有方法通过 Tauri invoke 调用

FsService 所有方法均通过 `@tauri-apps/api/core` 的 `invoke` 函数调用后端 Rust 命令。

**Evidence**: `src/domains/file/services/FsService.ts:1`

---

### CR-003: 原子写入保证崩溃安全

`writeFileAtomic` 使用临时文件 + rename 模式，确保写入过程中的崩溃安全。

**Evidence**: `src/domains/file/services/FsService.ts:49-51`（后端实现：`src-tauri/src/fs.rs`）

---

### CR-004: 路径类型返回四种状态

`getPathKind` 返回 `PathKind` 类型：`'file' | 'directory' | 'missing' | 'other'`。

**Evidence**: `src/domains/file/services/FsService.ts:8`

---

### CR-005: 工作区文件解析返回结构化配置

`parseWorkspaceFile` 返回 `WorkspaceConfig` 类型，包含 version、folders、state 字段。

**Evidence**: `src/domains/file/services/FsService.ts:16-24, 53-55`

---

### CR-006: 复制文件返回实际写入路径

`copyFileWithResult` 返回 `CopyFileResult` 类型，包含 `actualPath`（处理自动重命名后的实际路径）和 `bytesWritten`。

**Evidence**: `src/domains/file/services/FsService.ts:29-34, 98-103`

---

### CR-007: build_tree 保留空目录

`build_tree` 不再过滤空目录。递归收集子节点后，即使 children 为空，也返回 `FileNode { children: Some(vec![]) }`。空目录序列化为 `children: []`，前端可正常渲染。

**Evidence**: `src-tauri/src/fs.rs:48-100`

---

### CR-008: 资源目录名称由常量 ASSETS_DIR_NAME 定义

资源目录名称由 `const ASSETS_DIR_NAME` 统一定义，当前值为 `.assets`（隐藏目录）。`is_skipped_dir` 通过常量判断是否跳过。变更资源目录名只需修改一处。

- Rust 端：`src-tauri/src/fs.rs` 中 `const ASSETS_DIR_NAME: &str = ".assets"`
- 前端：`src/config/editor.ts` 中 `EDITOR_CONFIG.image.assetsDirName`

**Evidence**: `src-tauri/src/fs.rs:7`, `src/config/editor.ts:22`

---

## Impact Surface

| Area          | What to check                                    | Evidence                                                                                             |
| ------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| FsService API | 所有方法签名不变                                 | `src/domains/file/services/FsService.ts`                                                             |
| Tauri 命令    | Rust 后端命令签名与前端调用匹配                  | `src-tauri/src/fs.rs`、`src-tauri/src/workspace.rs`、`src-tauri/src/config.rs`                       |
| 类型定义      | FileNode、WorkspaceConfig、PathKind 等类型一致   | `src/state/types.ts`、`src/domains/file/services/FsService.ts:4-34`                                  |
| 依赖服务      | AutosaveService、workspaceActions 等依赖调用正确 | `src/domains/file/services/AutosaveService.ts`、`src/domains/workspace/services/workspaceActions.ts` |
| 测试覆盖      | 文件操作相关测试通过                             | 搜索 `FsService` 相关测试文件                                                                        |
| 空目录支持    | 空目录在文件树中正确显示                         | `src-tauri/src/fs.rs` 单元测试、前端 `flattenTree.test.ts`                                           |
| 资源目录常量  | `ASSETS_DIR_NAME` 前后端一致                     | `src-tauri/src/fs.rs`、`src/config/editor.ts`、`src/domains/editor/hooks/imageActions.ts`            |

---

## Shared Rules Dependency

| Shared Rule | Dependency                 | Lifted |
| ----------- | -------------------------- | ------ |
| none        | No shared rules identified | no     |

---

## Uncertainties

- `src/services/fs/` 目录为空，可能为历史遗留或预留目录，需确认是否应删除

---

## Known Consumers

| Consumer          | Usage                | Evidence                                              |
| ----------------- | -------------------- | ----------------------------------------------------- |
| workspaceActions  | 文件读写、目录树加载 | `src/domains/workspace/services/workspaceActions.ts`  |
| AutosaveService   | 原子写入             | `src/domains/file/services/AutosaveService.ts`        |
| imageActions      | 图片保存             | `src/domains/editor/hooks/imageActions.ts`            |
| persistenceBridge | 编辑器内容持久化     | `src/domains/editor/integration/persistenceBridge.ts` |
| FileTreeNode      | 文件节点操作         | `src/domains/file/ui/FileTreeNode.tsx`                |

---

## Archive Pointer

- None. This is a first-version capability document.
