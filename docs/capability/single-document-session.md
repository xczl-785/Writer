# single-document-session

## Quick Read

- **id**: `single-document-session`
- **name**: Single Document Session
- **summary**: 定义单文档会话状态、事件和 reducer，当前尚未接入 Writer 生产路径
- **scope**: 包括 single document session state/types/reducer/dirty 判断；不包括 workspace lifecycle、Sidebar/FileTree、RecentItems、StatusBar、生产 autosave 接入、随手写 App、独立包
- **entry_points**:
  - `src/core/session/singleDocumentSession.ts`
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

它还没有接入 Writer 生产路径。现有 workspaceStore、Sidebar/FileTree、RecentItems、StatusBar、autosave adapter 和 App close/navigation 逻辑仍沿用当前 Writer 实现。

---

## Entries

| Entry                              | Trigger                        | Evidence                                    | Notes                              |
| ---------------------------------- | ------------------------------ | ------------------------------------------- | ---------------------------------- |
| `createEmptySingleDocumentSession` | 创建空会话 state               | `src/core/session/singleDocumentSession.ts` | 返回 empty/null path/版本 0        |
| `reduceSingleDocumentSession`      | 根据 session event 归约 state  | `src/core/session/singleDocumentSession.ts` | 纯 reducer，不触发副作用           |
| `isSingleDocumentSessionDirty`     | 比较 content/saved version     | `src/core/session/singleDocumentSession.ts` | 版本不一致即 dirty                 |
| `src/core/session/index.ts`        | re-export core session surface | `src/core/session/index.ts`                 | 目前仅导出 single-document reducer |

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

### CR-004: 当前未生产接入

当前生产代码没有把 `SingleDocumentSession` 接入 App、workspaceStore、Sidebar/FileTree、RecentItems、StatusBar 或 autosave adapter。不要把它描述成随手写 App 或 SingleDocumentSession 生产接入已完成。

**Evidence**: `src/core/session/singleDocumentSession.ts`、`src/core/session/singleDocumentSession.test.ts`、`src/app/App.tsx`、`src/domains/workspace/services/WorkspaceManager.ts`

---

## Impact Surface

| Area                        | What to check                                                          | Evidence                                                                                                    |
| --------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Reducer semantics           | open/edit/save success/save failure/close 生命周期不回退               | `src/core/session/singleDocumentSession.test.ts`                                                            |
| Production boundary         | 不在未接入前改写 App/workspace autosave 当前真相                       | `src/app/App.tsx`、`src/domains/file/services/AutosaveService.ts`                                           |
| Future autosave integration | pending autosave + Cmd+S/切文件/关闭窗口/dirty close workspace 需要 QA | `src/app/commands/fileCommands.ts`、`src/app/App.tsx`、`src/domains/workspace/services/WorkspaceManager.ts` |
| Core purity                 | reducer 不 import Writer store、UI 或 services                         | `src/core/session/singleDocumentSession.ts`                                                                 |

---

## Shared Rules Dependency

| Shared Rule | Dependency                                                                                        | Lifted |
| ----------- | ------------------------------------------------------------------------------------------------- | ------ |
| none        | Autosave/save-core may later consume session state, but current reducer owns only its local rules | no     |

---

## Uncertainties

- 生产接入点、store 替换策略和 UI 状态映射尚未定义。
- dirty close workspace 与 pending autosave 的最终策略仍需 V3 QA 后固化。

---

## Known Consumers

| Consumer                     | Usage                                 | Evidence                                         |
| ---------------------------- | ------------------------------------- | ------------------------------------------------ |
| `src/core/session/index.ts`  | re-export session core public surface | `src/core/session/index.ts`                      |
| `singleDocumentSession.test` | 验证当前 reducer 语义                 | `src/core/session/singleDocumentSession.test.ts` |

---

## Archive Pointer

- None. This is the first capability document for V2 single document session core.
