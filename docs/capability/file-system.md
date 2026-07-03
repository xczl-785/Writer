# file-system

## Quick Read

- **id**: `file-system`
- **name**: 文件系统操作
- **summary**: 通过 FsService 维持统一前端文件 API；runtime-core 只定义纯 TS ports，Tauri 实现由 Writer runtime adapter 承接
- **scope**: 包括文件/目录 CRUD、路径类型检测、编码检测、原子写入、工作区文件解析、runtime fs/config/startup/dialog ports；不包括自动保存、拖拽处理
- **entry_points**:
  - Writer-facing `FsService` 方法调用
  - runtime-core port definitions at `src/core/runtime/fsPrimitives.ts`
  - Writer Tauri runtime adapter at `src/services/runtime/TauriRuntimePorts.ts`
- **shared_with**:
  - `save-core`
- **check_on_change**:
  - FsService API 不变
  - runtime ports 保持纯 TS，不直接 import/call Tauri
  - Writer runtime adapter 与 Tauri 命令签名同步
  - future save-core 接入前，`FsService.writeFileAtomic` 仍是 Writer adapter 的 throw/reject 文件写入入口
  - Tauri 命令签名同步
  - 类型定义一致
- **last_verified**: 2026-03-21

---

## Capability Summary

文件系统操作能力通过 FsService 维持统一、类型安全的 Writer-facing 文件操作入口。V4.5 runtime 边界收束后，`src/core/runtime/fsPrimitives.ts` 只保留纯 TypeScript port/interface/type 定义：`FileContentPort`、`PathInfoPort`、`AppConfigPort`、`FileDialogPort`、`StartupFilePort`、`RuntimePorts` 以及 `PathKind`、`EncodingStatus`、`JsonValue`、`Unlisten` 等基础类型。Tauri `invoke/listen/dialog` 实现由 Writer adapter `src/services/runtime/TauriRuntimePorts.ts` 承接。

调用方仍应依赖 Writer-facing service：文件操作经 FsService，启动文件经 StartupService，文件监听经 FileWatcherService，工作区对话框经 WorkspaceManager。业务和 UI 不应绕过这些 adapter 直接依赖 runtime-core ports。

V2 第一轮新增的 `src/core/save/*` 只是 future result-returning save-core port/types。当前生产 autosave adapter 仍直接调用 `FsService.writeFileAtomic`，并把其 throw/reject 语义交给 `SaveScheduler` failure path 处理。

---

## Entries

| Entry                         | Trigger                | Evidence                                          | V1 boundary note                                                 |
| ----------------------------- | ---------------------- | ------------------------------------------------- | ---------------------------------------------------------------- |
| FsService.listTree            | 加载目录树             | `src/domains/file/services/FsService.ts:48-50`    | Writer adapter 内直接调用 Tauri `list_tree`                      |
| FsService.listTreeBatch       | 批量加载多个根目录     | `src/domains/file/services/FsService.ts:52-54`    | Writer adapter 内直接调用 Tauri `list_tree_batch`                |
| FsService.readFile            | 读取文件内容           | `src/domains/file/services/FsService.ts:51-53`    | 委托 Writer runtime adapter `FileContentPort`                    |
| FsService.writeFileAtomic     | 原子写入文件           | `src/domains/file/services/FsService.ts:55-57`    | 委托 Writer runtime adapter `FileContentPort`                    |
| FsService.parseWorkspaceFile  | 解析工作区文件         | `src/domains/file/services/FsService.ts:64-66`    | Writer adapter 内直接调用 Tauri `parse_workspace_file`           |
| FsService.saveWorkspaceFile   | 保存工作区文件         | `src/domains/file/services/FsService.ts:68-73`    | Writer adapter 内直接调用 Tauri `save_workspace_file`            |
| FsService.createFile          | 创建新文件             | `src/domains/file/services/FsService.ts:75-77`    | Writer adapter 内直接调用 Tauri `create_file`                    |
| FsService.createDir           | 创建新目录             | `src/domains/file/services/FsService.ts:79-81`    | Writer adapter 内直接调用 Tauri `create_dir`                     |
| FsService.renameNode          | 重命名/移动节点        | `src/domains/file/services/FsService.ts:83-85`    | Writer adapter 内直接调用 Tauri `rename_node`                    |
| FsService.deleteNode          | 删除文件或目录         | `src/domains/file/services/FsService.ts:87-89`    | Writer adapter 内直接调用 Tauri `delete_node`                    |
| FsService.revealInFileManager | 在文件管理器中显示     | `src/domains/file/services/FsService.ts:91-93`    | Writer adapter 内直接调用 Tauri `reveal_in_file_manager`         |
| FsService.saveImage           | 保存图片（二进制）     | `src/domains/file/services/FsService.ts:95-97`    | Writer adapter 内直接调用 Tauri `save_image`                     |
| FsService.checkExists         | 检查路径是否存在       | `src/domains/file/services/FsService.ts:94-96`    | 委托 Writer runtime adapter `PathInfoPort`                       |
| FsService.copyFileWithResult  | 复制文件               | `src/domains/file/services/FsService.ts:109-114`  | Writer adapter 内直接调用 Tauri `copy_file_with_result`          |
| FsService.getPathKind         | 获取路径类型           | `src/domains/file/services/FsService.ts:111-113`  | 委托 Writer runtime adapter `PathInfoPort`                       |
| FsService.detectFileEncoding  | 检测文件编码           | `src/domains/file/services/FsService.ts:115-117`  | 委托 Writer runtime adapter `PathInfoPort`                       |
| FsService.getAppConfigDir     | 获取应用配置目录       | `src/domains/file/services/FsService.ts:120-122`  | 委托 Writer runtime adapter `AppConfigPort`                      |
| FsService.readJsonFile        | 读取 JSON 配置文件     | `src/domains/file/services/FsService.ts:124-126`  | 委托 Writer runtime adapter `AppConfigPort`                      |
| FsService.writeJsonFile       | 写入 JSON 配置文件     | `src/domains/file/services/FsService.ts:128-130`  | 委托 Writer runtime adapter `AppConfigPort`                      |
| fsPrimitives                  | runtime port 定义      | `src/core/runtime/fsPrimitives.ts:1-77`           | 纯 TS port/interface/type；不 import Tauri，不调用 invoke/listen |
| TauriRuntimePorts             | Writer runtime adapter | `src/services/runtime/TauriRuntimePorts.ts:1-123` | Tauri `invoke/listen/dialog` 实现集中入口                        |

---

## Current Rules

### CR-001: FsService 使用对象字面量单例模式

FsService 采用对象字面量实现，所有方法为 async，返回 Promise。不使用 class，不需要实例化。

**Evidence**: `src/domains/file/services/FsService.ts:36`

---

### CR-002: FsService API 稳定，通用 fs/config 能力委托到 Writer runtime adapter

FsService 仍是 Writer-facing 前端调用入口。目录树、工作区、创建、重命名、删除、复制、图片保存等领域文件操作仍在 FsService adapter 内调用 Tauri 命令；通用文件读写、路径检测、编码检测和配置文件读写由 FsService 委托给 `src/services/runtime/TauriRuntimePorts.ts` 中的 runtime adapter。UI 和业务服务不应直接依赖 runtime-core ports。

**Evidence**: `src/domains/file/services/FsService.ts:1-130`、`src/core/runtime/fsPrimitives.ts`、`src/services/runtime/TauriRuntimePorts.ts`

---

### CR-002A: runtime-core 不包含 Tauri runtime implementation

`src/core/runtime` 只能包含纯 TS port/interface/type，不得 import `@tauri-apps/*`，不得调用 `invoke`/`listen`，不得持有 Writer/Tauri 事件名。Tauri 命令名和事件名集中在 Writer adapter。

**Evidence**: `src/core/runtime/fsPrimitives.ts:1-77`、`src/services/runtime/TauriRuntimePorts.ts:1-123`

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

### CR-009: save-core 尚未替代 FsService adapter

`src/core/save/SavePort` 定义的是 future result-returning 保存端口。当前 Writer 生产保存仍由 `AutosaveService` adapter 调用 `FsService.writeFileAtomic`；未来若接入 save-core，需要显式把 `writeFileAtomic` 的 throw/reject 结果映射为 `SaveResult`。

**Evidence**: `src/core/save/savePort.ts`、`src/core/save/saveTypes.ts`、`src/domains/file/services/AutosaveService.ts`、`src/domains/file/services/FsService.ts`

---

## Impact Surface

| Area             | What to check                                                                            | Evidence                                                                                             |
| ---------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| FsService API    | 所有方法签名不变                                                                         | `src/domains/file/services/FsService.ts`                                                             |
| Runtime ports    | runtime-core 保持纯 TS ports；Tauri command/event 映射只在 Writer runtime adapter 中出现 | `src/core/runtime/fsPrimitives.ts`、`src/services/runtime/TauriRuntimePorts.ts`                      |
| Save core bridge | future `SavePort` 接入前，生产保存仍使用 FsService throw/reject adapter 语义             | `src/core/save/savePort.ts`、`src/domains/file/services/AutosaveService.ts`                          |
| Tauri 命令       | Rust 后端命令签名与前端调用匹配                                                          | `src-tauri/src/fs.rs`、`src-tauri/src/workspace.rs`、`src-tauri/src/config.rs`                       |
| 类型定义         | FileNode、WorkspaceConfig、PathKind 等类型一致                                           | `src/state/types.ts`、`src/domains/file/services/FsService.ts:4-34`                                  |
| 依赖服务         | AutosaveService、workspaceActions 等依赖调用正确                                         | `src/domains/file/services/AutosaveService.ts`、`src/domains/workspace/services/workspaceActions.ts` |
| 测试覆盖         | 文件操作相关测试通过                                                                     | 搜索 `FsService` 相关测试文件                                                                        |
| 空目录支持       | 空目录在文件树中正确显示                                                                 | `src-tauri/src/fs.rs` 单元测试、前端 `flattenTree.test.ts`                                           |
| 资源目录常量     | `ASSETS_DIR_NAME` 前后端一致                                                             | `src-tauri/src/fs.rs`、`src/config/editor.ts`、`src/domains/editor/hooks/imageActions.ts`            |

---

## Shared Rules Dependency

| Shared Rule | Dependency                                                                                                                      | Lifted |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------- | ------ |
| save-core   | FsService may provide the future adapter behind result-returning SavePort, but current production save path has not moved there | no     |

---

## Uncertainties

- `src/services/fs/` 历史/预留路径当前不存在；如未来恢复该路径，需要先明确是否仍只是兼容入口。

---

## Known Consumers

| Consumer             | Usage                                                                                      | Evidence                                              |
| -------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------- |
| workspaceActions     | 文件读写、目录树加载                                                                       | `src/domains/workspace/services/workspaceActions.ts`  |
| AutosaveService      | 原子写入                                                                                   | `src/domains/file/services/AutosaveService.ts`        |
| imageActions         | 图片保存                                                                                   | `src/domains/editor/hooks/imageActions.ts`            |
| persistenceBridge    | 编辑器内容持久化                                                                           | `src/domains/editor/integration/persistenceBridge.ts` |
| FileTreeNode         | 文件节点操作                                                                               | `src/domains/file/ui/FileTreeNode.tsx`                |
| runtime fsPrimitives | 纯 TS runtime port/interface/type 定义                                                     | `src/core/runtime/fsPrimitives.ts`                    |
| TauriRuntimePorts    | FsService/StartupService/FileWatcherService/WorkspaceManager 委托的 Writer runtime adapter | `src/services/runtime/TauriRuntimePorts.ts`           |

---

## Archive Pointer

- None. This is a first-version capability document.
