# single-document-session

## Quick Read

- **id**: `single-document-session`
- **name**: Single Document Session
- **summary**: `@writer/core` 定义单文档会话状态、事件、reducer 和 app-shell harness；QuickWrite 独立仓消费该 shell，Writer workspace 生产路径仍未接入
- **scope**: 包括 single document session state/types/reducer/dirty 判断、app-shell harness 的 open/edit/requestSave/saveSettled/close 契约；QuickWrite 单文档 session 编排和根 status bar 现归属 QuickWrite 仓；不包括 workspace lifecycle、Sidebar/FileTree、RecentItems、Writer 生产 StatusBar 接入和生产 autosave 接入
- **entry_points**:
  - `@writer/core/session`
  - `/Users/zhengpanpan/Program/Writer/Write-core/src/core/session`
  - `/Users/zhengpanpan/Program/Writer/QuickWrite/src/apps/quick-write/QuickWriteStatusBar.tsx`
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

Single Document Session 当前是 Core package reducer，用于描述单个文档从 empty/open/dirty/saving/closed 的状态流转，并通过版本号判断 dirty。

V4.5 增加 `singleDocumentSessionShell` 作为纯 app-shell harness，用来证明随手写 V5 可以围绕单文档 session、`SaveInput`/`SaveResult`、pending save 和 close view state 编排，而不依赖 Writer workspaceStore、file tree、recent 或 watcher。

V5.8.0D 之后，QuickWrite 主界面位于 QuickWrite 独立仓，并通过 `@writer/core/session` 消费该 shell 维持单文档 session、草稿恢复、打开 Markdown、保存到文件、file-backed 自动写回和关闭保护。它仍没有接入 Writer workspace 生产路径；现有 workspaceStore、Sidebar/FileTree、RecentItems、StatusBar、autosave adapter 和 App close/navigation 逻辑仍沿用当前 Writer 实现。

V5.8.0B 将 QuickWrite 文档身份展示归到根 app shell 的底部状态栏。编辑器 header 不再显示“草稿”小标题；`QuickWriteStatusBar` 复用 shared `StatusBarView` 的结构，显示保存状态、草稿/文件路径、字符数和编码，并作为 editor body 的 sibling 固定在底部，避免被内容滚动或横向滚动条吞掉。

同一轮中，QuickWrite File > Close 的产品语义调整为关闭当前窗口，而不是关闭当前文件并留下 closed-document view。关闭前仍会 flush 当前文档；flush 失败时窗口不关闭并显示错误。`singleDocumentSessionShell` 仍保留 `closeDocument` reducer 事件用于 core 状态建模，但 QuickWrite 菜单不再把它作为用户可见的“关闭文件”动作。

---

## Entries

| Entry                                  | Trigger                        | Evidence                                         | Notes                                                              |
| -------------------------------------- | ------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------ |
| `createEmptySingleDocumentSession`     | 创建空会话 state               | `@writer/core/session`                           | 返回 empty/null path/版本 0                                        |
| `reduceSingleDocumentSession`          | 根据 session event 归约 state  | `@writer/core/session`                           | 纯 reducer，不触发副作用                                           |
| `isSingleDocumentSessionDirty`         | 比较 content/saved version     | `@writer/core/session`                           | 版本不一致即 dirty                                                 |
| `reduceSingleDocumentSessionShell`     | 单文档 app shell 编排 harness  | `@writer/core/session`                           | open/edit/requestSave/saveSettled/close 纯状态流                   |
| `selectSingleDocumentSessionShellView` | app shell 视图状态选择器       | `@writer/core/session`                           | 暴露 canSave/canCloseWithoutSaving/pendingSave                     |
| `QuickWriteApp`                        | QuickWrite 单文档界面编排      | `QuickWrite/src/apps/quick-write/QuickWriteApp.tsx` | 消费 shell state，并由 QuickWrite runtime 执行恢复/打开/保存副作用 |
| `QuickWriteStatusBar`                  | QuickWrite 根状态栏展示        | `QuickWrite/src/apps/quick-write/QuickWriteStatusBar.tsx` | 展示草稿/文件路径、字符数、编码                                    |

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

**Evidence**: `/Users/zhengpanpan/Program/Writer/Write-core/src/core/session/singleDocumentSession.ts`、`/Users/zhengpanpan/Program/Writer/QuickWrite/src/apps/quick-write/QuickWriteApp.tsx`、`src/app/App.tsx`、`src/domains/workspace/services/WorkspaceManager.ts`

---

### CR-005: app-shell harness 不得引入 Writer workspace 语义

`singleDocumentSessionShell` 只编排单文档内容、session reducer、pending `SaveInput` 和 `SaveResult` 回填。它不得依赖 workspaceStore、file tree、RecentItems、FileWatcher、AutosaveService 或 UI service。

**Evidence**: `src/core/session/singleDocumentSessionShell.ts`、`src/core/session/singleDocumentSessionShell.test.ts`

---

### CR-006: QuickWrite 文档身份归属根状态栏

QuickWrite 的草稿/文件路径身份应由根 app shell 底部状态栏展示，编辑器 header 不再保留重复的“草稿”小标题。状态栏必须是 editor body 的 sibling，并复用 shared `StatusBarView` 结构；横向/纵向内容滚动不得把状态栏挤压进编辑内容区或覆盖文件身份。

**Evidence**: `/Users/zhengpanpan/Program/Writer/QuickWrite/src/apps/quick-write/QuickWriteAppShell.tsx`、`/Users/zhengpanpan/Program/Writer/QuickWrite/src/apps/quick-write/QuickWriteEditor.tsx`、`/Users/zhengpanpan/Program/Writer/QuickWrite/src/apps/quick-write/QuickWriteStatusBar.tsx`

---

### CR-007: QuickWrite 菜单关闭动作不进入 closed-document view

QuickWrite 顶部菜单的“关闭”动作代表关闭当前 QuickWrite 窗口。它可以复用当前 flush 保护，确保 dirty 内容写入成功后再关闭窗口；但不得把当前 UI 切换为 `documentKind === 'closed'` 的可见状态，也不得重新展示“关闭文件”文案。

**Evidence**: `/Users/zhengpanpan/Program/Writer/QuickWrite/src/apps/quick-write/QuickWriteApp.tsx`、`/Users/zhengpanpan/Program/Writer/QuickWrite/src/apps/quick-write/QuickWriteMenuAdapter.tsx`

---

## Impact Surface

| Area                        | What to check                                                              | Evidence                                                                                                    |
| --------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Reducer semantics           | open/edit/save success/save failure/close 生命周期不回退                   | `src/core/session/singleDocumentSession.test.ts`                                                            |
| Shell harness               | requestSave 生成 `SaveInput`，saveSettled 根据 `SaveResult` 回填状态       | `src/core/session/singleDocumentSessionShell.test.ts`                                                       |
| QuickWrite consumer         | 单文档恢复/打开/保存/关闭不依赖 workspace、file tree、recent               | QuickWrite 仓 `src/apps/quick-write/QuickWriteApp.tsx`、`src/apps/quick-write/importBoundary.test.ts`       |
| QuickWrite status identity  | 草稿/文件路径身份显示在根状态栏，编辑器 header 不重复显示                  | QuickWrite 仓 `src/apps/quick-write/QuickWriteStatusBar.tsx`、`src/apps/quick-write/QuickWriteEditor.tsx`   |
| QuickWrite close semantics  | 菜单“关闭”先 flush 当前文档再关闭窗口，不进入 visible closed-document view | QuickWrite 仓 `src/apps/quick-write/QuickWriteApp.tsx`                                                      |
| Production boundary         | 不在未接入前改写 App/workspace autosave 当前真相                           | `src/app/App.tsx`、`src/domains/file/services/AutosaveService.ts`                                           |
| Future autosave integration | pending autosave + Cmd+S/切文件/关闭窗口/dirty close workspace 需要 QA     | `src/app/commands/fileCommands.ts`、`src/app/App.tsx`、`src/domains/workspace/services/WorkspaceManager.ts` |
| Core purity                 | reducer 和 shell harness 不 import Writer store、UI 或 services            | `src/core/session/singleDocumentSession.ts`、`src/core/session/singleDocumentSessionShell.ts`               |

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
- QuickWrite status/chrome 物理归属已在 V5.8.0D 迁移到 QuickWrite 仓；后续精修不得反向侵入 Writer workspace。

---

## Known Consumers

| Consumer                          | Usage                                               | Evidence                                              |
| --------------------------------- | --------------------------------------------------- | ----------------------------------------------------- |
| `@writer/core/session`            | Core session public surface                         | `Write-core/src/core/session/index.ts`                |
| `QuickWriteApp`                   | QuickWrite 单文档 session 编排和 runtime 副作用入口 | `QuickWrite/src/apps/quick-write/QuickWriteApp.tsx`   |
| `QuickWriteStatusBar`             | QuickWrite 根 app shell 状态栏入口                  | `QuickWrite/src/apps/quick-write/QuickWriteStatusBar.tsx` |
| `singleDocumentSession.test`      | 验证当前 reducer 语义                               | `src/core/session/singleDocumentSession.test.ts`      |
| `singleDocumentSessionShell.test` | 验证 app-shell harness 不依赖 Writer workspace 语义 | `src/core/session/singleDocumentSessionShell.test.ts` |

---

## Archive Pointer

- None. This is the first capability document for V2 single document session core.
