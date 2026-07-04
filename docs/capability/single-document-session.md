# single-document-session

## Quick Read

- **id**: `single-document-session`
- **name**: Single Document Session
- **summary**: 定义单文档会话状态、事件、reducer 和 app-shell harness；QuickWrite 单文档主界面消费该 shell，Writer workspace 生产路径仍未接入
- **scope**: 包括 single document session state/types/reducer/dirty 判断、app-shell harness 的 open/edit/requestSave/saveSettled/close 契约，以及 QuickWrite 单文档 session 编排；不包括 workspace lifecycle、Sidebar/FileTree、RecentItems、StatusBar、生产 autosave 接入、独立包
- **entry_points**:
  - `src/core/session/singleDocumentSession.ts`
  - `src/core/session/singleDocumentSessionShell.ts`
  - `src/core/session/index.ts`
- **shared_with**:
  - `autosave`
  - `save-core`
- **check_on_change**:
  - reducer 保持纯函数，不依赖 Writer stores/UI
  - 不声称已接入生产 editor/workspace/session
  - 后续接入前需要重新 QA dirty close workspace、切文件、关闭窗口和 pending autosave 场景
- **last_verified**: 2026-07-03

---

## Capability Summary

Single Document Session 当前是 V2 第一轮新增的 core reducer，用于描述单个文档从 empty/open/dirty/saving/closed 的状态流转，并通过版本号判断 dirty。

V4.5 增加 `singleDocumentSessionShell` 作为纯 app-shell harness，用来证明随手写 V5 可以围绕单文档 session、`SaveInput`/`SaveResult`、pending save 和 close view state 编排，而不依赖 Writer workspaceStore、file tree、recent 或 watcher。

V5.8.0 QuickWrite UI 回正后，QuickWrite 主界面通过 `QuickWriteApp` 消费该 shell 维持单文档 session、草稿恢复、打开 Markdown、保存到文件、file-backed 自动写回和关闭保护。它仍没有接入 Writer workspace 生产路径；现有 workspaceStore、Sidebar/FileTree、RecentItems、StatusBar、autosave adapter 和 App close/navigation 逻辑仍沿用当前 Writer 实现。

---

## Entries

| Entry                                  | Trigger                        | Evidence                                         | Notes                                            |
| -------------------------------------- | ------------------------------ | ------------------------------------------------ | ------------------------------------------------ |
| `createEmptySingleDocumentSession`     | 创建空会话 state               | `src/core/session/singleDocumentSession.ts`      | 返回 empty/null path/版本 0                      |
| `reduceSingleDocumentSession`          | 根据 session event 归约 state  | `src/core/session/singleDocumentSession.ts`      | 纯 reducer，不触发副作用                         |
| `isSingleDocumentSessionDirty`         | 比较 content/saved version     | `src/core/session/singleDocumentSession.ts`      | 版本不一致即 dirty                               |
| `reduceSingleDocumentSessionShell`     | 单文档 app shell 编排 harness  | `src/core/session/singleDocumentSessionShell.ts` | open/edit/requestSave/saveSettled/close 纯状态流 |
| `selectSingleDocumentSessionShellView` | app shell 视图状态选择器       | `src/core/session/singleDocumentSessionShell.ts` | 暴露 canSave/canCloseWithoutSaving/pendingSave   |
| `src/core/session/index.ts`            | re-export core session surface | `src/core/session/index.ts`                      | 目前仅导出 single-document reducer               |
| `QuickWriteApp`                        | QuickWrite 单文档界面编排      | `src/apps/quick-write/QuickWriteApp.tsx`         | 消费 shell state，并由 QuickWrite runtime 执行恢复/打开/保存副作用 |

---

## Current Rules

### CR-001: reducer 只建模单文档生命周期

状态包含 `empty/open/dirty/saving/closed`，事件包含 opened、edited、saveStarted、saveSucceeded、saveFailed、closed。该 reducer 不建模 workspace lifecycle、多根目录、文件树或 recent items。

**Evidence**: `src/core/session/singleDocumentSession.ts`

---

### CR-002: dirty 由 contentVersion 与 savedVersion 比较得出

打开文档时两个版本对齐；编辑会增加 `contentVersion`；保存成功把 `savedVersion` 对齐到当前 `contentVersion`。`isSingleDocumentSessionDirty` 只比较两个版本。

**Evidence**: `src/core/session/singleDocumentSession.ts`、`src/core/session/singleDocumentSession.test.ts`

---

### CR-003: save failure 回到 dirty

只有 `saving` 状态接收到 `saveFailed` 时会回到 `dirty`；`saveSucceeded` 只在 `saving` 状态下回到 `open` 并更新 `savedVersion`。

**Evidence**: `src/core/session/singleDocumentSession.ts`、`src/core/session/singleDocumentSession.test.ts`

---

### CR-004: QuickWrite 已接入，Writer workspace 生产路径未接入

QuickWrite 当前主界面消费 `singleDocumentSessionShell` 管理单文档状态，但 Writer workspace 生产代码没有把 `SingleDocumentSession` 接入 App、workspaceStore、Sidebar/FileTree、RecentItems、StatusBar 或 autosave adapter。不要把它描述成 Writer workspace/session 生产接入已完成。

**Evidence**: `src/core/session/singleDocumentSession.ts`、`src/core/session/singleDocumentSession.test.ts`、`src/apps/quick-write/QuickWriteApp.tsx`、`src/app/App.tsx`、`src/domains/workspace/services/WorkspaceManager.ts`

---

### CR-005: app-shell harness 不得引入 Writer workspace 语义

`singleDocumentSessionShell` 只编排单文档内容、session reducer、pending `SaveInput` 和 `SaveResult` 回填。它不得依赖 workspaceStore、file tree、RecentItems、FileWatcher、AutosaveService 或 UI service。

**Evidence**: `src/core/session/singleDocumentSessionShell.ts`、`src/core/session/singleDocumentSessionShell.test.ts`

---

## Impact Surface

| Area                        | What to check                                                          | Evidence                                                                                                    |
| --------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Reducer semantics           | open/edit/save success/save failure/close 生命周期不回退               | `src/core/session/singleDocumentSession.test.ts`                                                            |
| Shell harness               | requestSave 生成 `SaveInput`，saveSettled 根据 `SaveResult` 回填状态   | `src/core/session/singleDocumentSessionShell.test.ts`                                                       |
| QuickWrite consumer         | 单文档恢复/打开/保存/关闭不依赖 workspace、file tree、recent            | `src/apps/quick-write/QuickWriteApp.test.ts`、`src/apps/quick-write/importBoundary.test.ts`                 |
| Production boundary         | 不在未接入前改写 App/workspace autosave 当前真相                       | `src/app/App.tsx`、`src/domains/file/services/AutosaveService.ts`                                           |
| Future autosave integration | pending autosave + Cmd+S/切文件/关闭窗口/dirty close workspace 需要 QA | `src/app/commands/fileCommands.ts`、`src/app/App.tsx`、`src/domains/workspace/services/WorkspaceManager.ts` |
| Core purity                 | reducer 和 shell harness 不 import Writer store、UI 或 services        | `src/core/session/singleDocumentSession.ts`、`src/core/session/singleDocumentSessionShell.ts`               |

---

## Shared Rules Dependency

| Shared Rule | Dependency                                                                                        | Lifted |
| ----------- | ------------------------------------------------------------------------------------------------- | ------ |
| none        | Autosave/save-core may later consume session state, but current reducer owns only its local rules | no     |

---

## Uncertainties

- 生产接入点、store 替换策略和 UI 状态映射尚未定义。
- dirty close workspace 与 pending autosave 的最终策略仍需 V3 QA 后固化。
- recovery draft manager、Save As、关闭保护 UI 不在 V4.5 harness 已完成范围内。

---

## Known Consumers

| Consumer                          | Usage                                               | Evidence                                              |
| --------------------------------- | --------------------------------------------------- | ----------------------------------------------------- |
| `src/core/session/index.ts`       | re-export session core public surface               | `src/core/session/index.ts`                           |
| `QuickWriteApp`                   | QuickWrite 单文档 session 编排和 runtime 副作用入口 | `src/apps/quick-write/QuickWriteApp.tsx`              |
| `singleDocumentSession.test`      | 验证当前 reducer 语义                               | `src/core/session/singleDocumentSession.test.ts`      |
| `singleDocumentSessionShell.test` | 验证 app-shell harness 不依赖 Writer workspace 语义 | `src/core/session/singleDocumentSessionShell.test.ts` |

---

## Archive Pointer

- None. This is the first capability document for V2 single document session core.
